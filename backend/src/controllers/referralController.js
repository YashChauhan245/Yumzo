const { validationResult } = require('express-validator');
const referralService = require('../services/prismaReferralService');
const logger = require('../config/logger');

// GET /api/user/referrals - get user's referral code and stats
const getUserReferrals = async (req, res) => {
  try {
    const userId = req.user.id;
    const referrals = await referralService.getUserReferrals(userId);

    return res.status(200).json({
      success: true,
      count: referrals.length,
      data: { referrals },
    });
  } catch (error) {
    logger.error('getUserReferrals error', { userId: req.user.id, error: error.message });
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// POST /api/user/referrals/create - create a new referral code
const createReferral = async (req, res) => {
  try {
    const userId = req.user.id;
    const { credit_amount = 50, max_uses = 999 } = req.body;

    const referral = await referralService.createReferral(userId, parseFloat(credit_amount), parseInt(max_uses));

    logger.info('Referral code created', {
      userId,
      referralCode: referral.referral_code,
      creditAmount: credit_amount,
    });

    return res.status(201).json({
      success: true,
      message: 'Referral code created',
      data: { referral },
    });
  } catch (error) {
    logger.error('createReferral error', { userId: req.user.id, error: error.message });
    return res.status(500).json({ success: false, message: error.message || 'Internal server error' });
  }
};

// POST /api/user/referrals/apply - apply a referral code
const applyReferralCode = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({ success: false, errors: errors.array() });
  }

  try {
    const userId = req.user.id;
    const { code } = req.body;

    // Get referral by code
    const referral = await referralService.getReferralByCode(code);
    if (!referral) {
      return res.status(400).json({
        success: false,
        message: 'Invalid, expired, or already used referral code',
      });
    }

    // Apply the code
    const usage = await referralService.applyReferralCode(referral.id, userId);

    logger.info('Referral code applied', {
      userId,
      referralCode: code,
      creditAmount: referral.credit_amount,
    });

    return res.status(200).json({
      success: true,
      message: `Congratulations! You've earned ₹${referral.credit_amount} credit`,
      data: {
        credit_earned: referral.credit_amount,
        usage,
      },
    });
  } catch (error) {
    logger.error('applyReferralCode error', { userId: req.user.id, error: error.message });
    return res.status(400).json({
      success: false,
      message: error.message || 'Failed to apply referral code',
    });
  }
};

// GET /api/user/referrals/:code - validate a referral code
const validateReferralCode = async (req, res) => {
  try {
    const { code } = req.params;

    const referral = await referralService.getReferralByCode(code);
    if (!referral) {
      return res.status(400).json({
        success: false,
        message: 'Invalid, expired, or already used referral code',
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        valid: true,
        credit_amount: referral.credit_amount,
        remaining_uses: referral.max_uses - referral.current_uses,
      },
    });
  } catch (error) {
    logger.error('validateReferralCode error', { code: req.params.code, error: error.message });
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

module.exports = {
  getUserReferrals,
  createReferral,
  applyReferralCode,
  validateReferralCode,
};
