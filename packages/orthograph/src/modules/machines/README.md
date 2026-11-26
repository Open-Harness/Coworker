# machines

Owns `Blueprint.machine`: states, moves (named by key) and the generated refusal `notFrom`. Moves with a list in
`to` let the handler choose the outcome. A move naming an undeclared state fails at load, which the compiler
reports. Test: `machines.test.ts`.
