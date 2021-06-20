exports.mostFrequent = arr => {
  const counts = arr.reduce((a, c) => {
    a[c] = (a[c] || 0) + 1
    return a
  }, {})
  const maxCount = Math.max(...Object.values(counts))
  return Object.keys(counts).filter(k => counts[k] === maxCount)
}
