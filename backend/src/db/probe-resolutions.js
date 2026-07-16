const ids = ['3327722', '5721039', '5946762', '3298572', '5587442'];
const suffixes = [
  'uhd_2560_1440_24fps',
  'uhd_2560_1440_25fps',
  'uhd_2560_1440_30fps',
  'sd_360_640_24fps',
  'sd_360_640_25fps',
  'sd_360_640_30fps',
  'sd_540_960_24fps',
  'sd_540_960_25fps',
  'sd_540_960_30fps',
  'uhd_1440_2560_24fps',
  'uhd_1440_2560_25fps',
  'uhd_1440_2560_30fps',
  'sd_640_360_24fps',
  'sd_640_360_25fps',
  'sd_640_360_30fps',
  'sd_960_540_24fps',
  'sd_960_540_25fps',
  'sd_960_540_30fps'
];

(async () => {
  for (const id of ids) {
    console.log(`Probing ID: ${id}...`);
    for (const suffix of suffixes) {
      const url = `https://videos.pexels.com/video-files/${id}/${id}-${suffix}.mp4`;
      try {
        const res = await fetch(url, { method: 'HEAD' });
        if (res.status === 200) {
          console.log(`  FOUND WORKING URL: ${url}`);
          break;
        }
      } catch (e) {
        // ignore
      }
    }
  }
})();
