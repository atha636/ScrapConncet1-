export function maskUpi(upiId) {
  const [handle, bank] = upiId.split("@");
  if (!bank) return upiId;
  const visible = handle.slice(0, 2);
  return `${visible}${"•".repeat(Math.max(handle.length - 2, 3))}@${bank}`;
}

export function maskAccountNumber(number) {
  return `${"•".repeat(Math.max(number.length - 4, 0))}${number.slice(-4)}`;
}