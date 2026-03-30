export function calcScore(income: number, expenses: number, totalDebt: number, invValue: number, goalsSaved: number, txCount: number): number {
  let score = 0
  const savingsRate = income > 0 ? (income - expenses) / income : 0
  if (savingsRate >= 0.2) score += 30
  else if (savingsRate >= 0.1) score += 20
  else if (savingsRate > 0) score += 10

  const debtRatio = income > 0 ? totalDebt / (income * 12) : 1
  if (debtRatio === 0) score += 25
  else if (debtRatio < 0.3) score += 20
  else if (debtRatio < 0.6) score += 10

  const emergencyRatio = income > 0 ? goalsSaved / (income * 3) : 0
  if (emergencyRatio >= 1) score += 20
  else if (emergencyRatio >= 0.5) score += 12
  else if (emergencyRatio > 0) score += 6

  if (invValue > 0) score += 15

  if (txCount >= 10) score += 10
  else if (txCount >= 5) score += 6
  else if (txCount > 0) score += 3

  return Math.min(score, 100)
}
