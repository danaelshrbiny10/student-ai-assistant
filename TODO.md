# TODO: Fix Errors in ai_test.py

- [ ] Remove the request logging line in ask_question method (missing import)
- [ ] Fix response access in generate_quiz: change response.text to response['response']
- [ ] Fix iteration in _add_breaks_and_meals to avoid modifying list while iterating
- [ ] Update __init__ to use the passed model parameter if no modelfile is provided
