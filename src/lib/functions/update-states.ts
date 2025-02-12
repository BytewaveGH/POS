export const UpdateStates = <T extends object, K extends keyof T>(
  setStates: React.Dispatch<React.SetStateAction<T>>,
  key?: K,
  value?: T[K],
  batchObj?: Partial<T>
) => {
  if (batchObj) {
    // If batchObj is provided, update the state with the batch object
    setStates((prev) => ({ ...prev, ...batchObj }))
  } else if (key !== undefined) {
    // If key is provided, update the state with the single key-value pair
    setStates((prev) => ({ ...prev, [key]: value }))
  }
}
