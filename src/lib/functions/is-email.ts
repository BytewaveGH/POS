export function isEmail(input: string) {
  // Regular expression to check if the input is a valid email
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

  return emailRegex.test(input)
}
