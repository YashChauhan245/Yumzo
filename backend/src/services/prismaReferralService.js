const prisma = require('../config/prisma');
const crypto = require('crypto');

const generateReferralCode = (email) => {
  const hash = crypto.createHash('sha256').update(email + Date.now()).digest('hex');
  return hash.substring(0, 8).toUpperCase();
};

const createReferral = async (referrerId, creditAmount = 50, maxUses = 999) => {
  const user = await prisma.user.findUnique({ where: { id: referrerId } });
  if (!user) throw new Error('User not found');

  const referralCode = generateReferralCode(user.email);

  const referral = await prisma.referral.create({
    data: {
      referrerId,
      referralCode,
      creditAmount,
      maxUses,
    },
  });

  return formatReferral(referral);
};

const formatReferral = (r) => ({
  id: r.id,
  referrer_id: r.referrerId,
  referral_code: r.referralCode,
  max_uses: r.maxUses,
  current_uses: r.currentUses,
  credit_amount: parseFloat(r.creditAmount),
  is_active: r.isActive,
  expires_at: r.expiresAt,
  created_at: r.createdAt,
});

const getReferralByCode = async (code) => {
  const referral = await prisma.referral.findUnique({
    where: { referralCode: code },
  });

  if (!referral) return null;

  // Check if expired or max uses reached
  if (!referral.isActive) return null;
  if (referral.expiresAt && referral.expiresAt < new Date()) return null;
  if (referral.currentUses >= referral.maxUses) return null;

  return formatReferral(referral);
};

const applyReferralCode = async (referralId, refereeId) => {
  const referral = await prisma.referral.findUnique({
    where: { id: referralId },
  });

  if (!referral || referral.currentUses >= referral.maxUses) {
    throw new Error('Referral code is not valid or expired');
  }

  // Check if this referee has already used this referral
  const existing = await prisma.referralUsage.findMany({
    where: { referralId, refereeId },
  });

  if (existing.length > 0) {
    throw new Error('You have already used this referral code');
  }

  // Create usage record
  const usage = await prisma.referralUsage.create({
    data: {
      referralId,
      refereeId,
      creditApplied: referral.creditAmount,
    },
  });

  // Increment current uses
  await prisma.referral.update({
    where: { id: referralId },
    data: { currentUses: { increment: 1 } },
  });

  return {
    id: usage.id,
    credit_applied: parseFloat(usage.creditApplied),
    created_at: usage.createdAt,
  };
};

const getUserReferrals = async (userId) => {
  const referrals = await prisma.referral.findMany({
    where: { referrerId: userId },
    include: {
      usages: { select: { id: true, refereeId: true, creditApplied: true, createdAt: true } },
    },
  });

  return referrals.map((r) => ({
    ...formatReferral(r),
    total_credited: referrals.reduce((sum, ref) => sum + parseFloat(ref.creditAmount) * ref.currentUses, 0),
    usages: r.usages.map((u) => ({
      id: u.id,
      referee_id: u.refereeId,
      credit_applied: parseFloat(u.creditApplied),
      created_at: u.createdAt,
    })),
  }));
};

module.exports = {
  createReferral,
  getReferralByCode,
  applyReferralCode,
  getUserReferrals,
  generateReferralCode,
  formatReferral,
};
