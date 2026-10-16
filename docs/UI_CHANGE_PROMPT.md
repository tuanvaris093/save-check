
# UI_CHANGE_PROMPT.md
# Prompt สำหรับให้ AI เปลี่ยน UI เดิมให้เป็น SafeCheck Modern Glass UI

ใช้ prompt นี้ใน Cursor / Claude Code / Windsurf หลังจากแนบ `UI_DESIGN_SPEC.md`

```text
You are a senior product UI engineer and frontend developer.

Please refactor and improve the existing SafeCheck UI according to UI_DESIGN_SPEC.md.

Current goal:
Transform the current basic assessment UI into a modern, production-quality, responsive glassmorphism web app.

Important requirements:
1. Remove all emoji from the entire project.
2. Replace all emoji with appropriate lucide-react icons.
3. Use a blue / sky / white health and safety theme.
4. Make all cards rounded, soft, glassy, and modern.
5. Use soft shadows, subtle blur, light gradients, and clean spacing.
6. Mobile must use a floating oval / capsule bottom navigation.
7. The mobile bottom nav must be centered horizontally, lifted above the bottom edge, around 80-90% width, very rounded, glassy, blurry, and softly shadowed.
8. The mobile bottom nav must not be a full-width flat bottom bar.
9. Tablet and desktop must use a left glass sidebar.
10. Sidebar and mobile bottom nav must share the same style family: glass, blur, rounded, soft shadow, blue/white theme.
11. Do not use a desktop top navbar.
12. Desktop dashboard should use sidebar + main content layout.
13. Tablet should use sidebar or compact sidebar.
14. Mobile should keep content single-column and easy to tap.
15. Make the home page look polished like a real mobile app.
16. Make assessment cards, category cards, forms, result page, and dashboard production-quality.
17. Keep the app simple and professional.
18. Do not add login.
19. Do not add register.
20. Do not add dynamic routes.
21. Do not change the product scope.
22. Do not change API/data logic unless needed for UI integration.
23. Keep code clean, reusable, and easy to maintain.

Implementation instructions:
- Create reusable UI components for cards, buttons, sidebar, floating bottom navigation, badges, and form controls.
- Centralize design tokens where possible.
- Ensure responsive breakpoints:
  - Mobile: floating oval / capsule bottom navigation
  - Tablet/Desktop: left glass sidebar
- Use lucide-react icons only.
- Ensure no emoji remain in source files.
- Add loading, empty, and error states where UI needs them.
- Keep accessibility in mind: labels, readable contrast, large touch targets.
- Add enough bottom padding on mobile so content is not hidden behind the floating bottom nav.

After finishing:
- Summarize changed files.
- Confirm that no emoji remain.
- Confirm that desktop does not use top navbar.
- Confirm that mobile uses floating oval / capsule bottom navigation.
- Confirm that tablet/desktop use left glass sidebar.
- Confirm that sidebar and bottom nav visually match as the same design system.
```
