# Copilot Instructions - AI Interview Communication Simulator

## House rules

1. **Vanilla only.** No React, Vue, Angular, Next.js, npm packages, or build tools. Use HTML, CSS, JavaScript, and Browser APIs only unless I explicitly ask otherwise.

2. **Keep the project simple.** Only use `index.html`, `style.css`, and `app.js`. Do not create additional files without asking first.

3. **Preserve existing code.** Do not rewrite or remove working code unless I specifically request it. Only modify the section related to the requested feature.

4. **Write clean, modular code.** Use small reusable functions with descriptive names. Avoid duplicated logic and deeply nested code.

5. **Comments only when the *why* is non-obvious.** Do not narrate what the code does—the names should already say it.

6. **Maintain a consistent UI.** Reuse existing styles and keep spacing, colors, fonts, and layouts consistent throughout the project.

7. **Handle errors gracefully.** Validate user input and display clear error messages. Never allow the application to crash because of invalid or missing data.

8. **Keep API keys secure.** Never hard-code API keys or secrets in client-side code. Use placeholders if necessary.

9. **Botpress manages the conversation.** Do not recreate chatbot logic in JavaScript. JavaScript should only handle UI interactions and API communication.

10. **Gemini handles AI tasks.** Use Gemini to generate interview questions, evaluate answers, score communication, and provide feedback. Do not simulate AI responses with hard-coded logic.

11. **n8n handles automation.** Use n8n for workflows such as saving scores, generating reports, and connecting external services. Keep workflow logic out of the frontend whenever possible.

12. **Focus on communication coaching.** The application should evaluate technical accuracy, clarity of explanation, logical reasoning, confidence, and communication skills—not just whether the answer is correct.

13. **Follow the interview flow.** Ask one question at a time, wait for the student's response, evaluate it, display feedback, update the score, and then continue to the next question.

14. **Keep code readable.** Prefer simple, maintainable solutions over clever ones. Optimize for clarity first.

15. **Ask before making major architectural changes.** Do not introduce frameworks, libraries, databases, or large structural changes unless I explicitly request them.