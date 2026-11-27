# blanks

Owns `Blueprint.todo`: a typed hole that compiles anywhere a declaration needs a value, so a scaffold builds before
it is filled. The compiler finds blanks by walking declarations; a declaration with blanks gets no handler. Test:
`blanks.test.ts`.
