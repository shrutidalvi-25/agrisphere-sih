// Rule-based "AI grading" stub — no trained model behind this (see the
// price-intel module's sell/hold advisor for the same philosophy: simple,
// explainable rules a farmer can actually understand, not a black box).
// Grades a lot from what the farmer already told us: whether a photo was
// attached (a graded lot with photo evidence is more trustworthy to buyers)
// and the batch size (very small lots are harder to grade confidently).
export function gradeLot({ quantityQuintal, hasPhoto, notes }) {
  let score = 50

  if (hasPhoto) score += 30
  else score -= 10

  if (quantityQuintal >= 5) score += 10
  if (quantityQuintal >= 20) score += 10

  if (notes && notes.trim().length > 15) score += 10

  score = Math.max(0, Math.min(100, score))

  // Returns a translation key (grading.<key>) rather than a finished
  // English sentence, so the reason renders in whoever is viewing it's
  // current language instead of being frozen in whatever language was
  // active the moment the lot was created — see the `grading` keys in
  // src/locales/*.json and where reasonKey is displayed (CreateLot.jsx).
  let grade, reasonKey
  if (score >= 75) {
    grade = 'A'
    reasonKey = hasPhoto ? 'photoHighGrade' : 'largeBatchNoPhoto'
  } else if (score >= 45) {
    grade = 'B'
    reasonKey = hasPhoto ? 'photoSmallerBatch' : 'noPhotoGradeB'
  } else {
    grade = 'C'
    reasonKey = 'smallBatchNoPhoto'
  }

  return { grade, reasonKey, score }
}
