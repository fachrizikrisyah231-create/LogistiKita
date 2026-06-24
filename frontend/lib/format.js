export const formatRupiah = (value) => {
  if (value == null || isNaN(Number(value))) return '0';
  return Math.round(Number(value)).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
};
