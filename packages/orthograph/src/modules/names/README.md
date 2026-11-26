# names

Owns the framework's own names, in their three spellings (`design/naming.md`): `Names.product` in prose,
`Names.short` for everything typed or machine-facing, `Names.scope` and `Names.frontDoor` on npm. Code that builds a
package name, the command, the folder or a variable reads it from here, never from a string literal (rule 7). Exported
from `orthograph/server`, for the framework's own packages. Test: `names.test.ts`.
