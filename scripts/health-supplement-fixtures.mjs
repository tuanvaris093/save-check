// Test fixtures only: the application always starts with unanswered fields.
export function supplementFixture(domain, category) {
  const draft = { answers: {}, details: {} };
  for (const section of domain.HEALTH_SUPPLEMENT_SECTIONS[category]) {
    for (const q of section.questions) {
      if (!domain.supplementQuestionVisible(q, draft)) continue;
      draft.answers[q.id] = q.multiple
        ? [q.options[0].value]
        : q.options[0].value;
    }
  }
  return draft;
}
