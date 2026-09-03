import { SharedArray } from 'k6/data';

export const vins = new SharedArray('vins', () => {
  const rows = JSON.parse(open('./vins.json'));
  return rows.filter((item) => item && item.vin && item.vin.trim().length > 0);
});

export function getVinForVU() {
  if (__ENV.VIN) return __ENV.VIN;

  if (vins.length === 0) {
    throw new Error('VIN is required. Pass -e VIN=<valid-vin> or add valid VINs to data/vins.json.');
  }

  return vins[(__VU - 1) % vins.length].vin;
}
