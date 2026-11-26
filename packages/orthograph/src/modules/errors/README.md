# errors

Owns `Blueprint.error`: data refusals with an exit code, named by their exported class. The compiler stamps each
class with its name (`ErrorNames.name`); until then `_tag` is unset. Test: `errors.test.ts`.
