# values

Owns `Blueprint.value`, `id`, `uint` and `text`: the named types a thing's fields are made of.

Invariants: a value is plain data (`{ kind: "value", schema }`) with no name; its name, when it has one, is its export.
Ids are branded by prefix, so an allowance id never type-checks as an organisation id.

Test: `values.test.ts` decodes good and bad inputs through each value's schema.
