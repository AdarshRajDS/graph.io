export const ALLOWED_FUNCTIONS = [
  "sin",
  "cos",
  "tan",
  "asin",
  "acos",
  "atan",
  "sinh",
  "cosh",
  "exp",
  "log",
  "ln",
  "sqrt",
  "abs",
] as const;

export const ALLOWED_CONSTANTS = ["pi", "e"] as const;

export const MAX_EXPRESSION_LENGTH = 120;
export const MAX_AST_DEPTH = 32;
export const PARAM_MIN = -50;
export const PARAM_MAX = 50;

export type AllowedFunction = (typeof ALLOWED_FUNCTIONS)[number];

export type AstNode =
  | { type: "number"; value: number }
  | { type: "name"; name: string }
  | { type: "unary"; op: "-"; argument: AstNode }
  | { type: "binary"; op: "+" | "-" | "*" | "/" | "^"; left: AstNode; right: AstNode }
  | { type: "call"; name: AllowedFunction; argument: AstNode };

export class ExpressionSyntaxError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ExpressionSyntaxError";
  }
}

type Token =
  | { kind: "number"; value: number }
  | { kind: "name"; value: string }
  | { kind: "op"; value: string };

function tokenize(source: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  while (i < source.length) {
    const ch = source[i];
    if (ch === " " || ch === "\t" || ch === "\n") {
      i += 1;
      continue;
    }
    if (/[0-9.]/.test(ch)) {
      const match = source.slice(i).match(/^\d+(\.\d+)?|\.\d+/);
      if (!match) {
        throw new ExpressionSyntaxError(`Invalid number at position ${i}`);
      }
      tokens.push({ kind: "number", value: Number(match[0]) });
      i += match[0].length;
      continue;
    }
    if (/[A-Za-z_]/.test(ch)) {
      const match = source.slice(i).match(/^[A-Za-z_][A-Za-z0-9_]*/);
      if (!match) {
        throw new ExpressionSyntaxError(`Invalid name at position ${i}`);
      }
      tokens.push({ kind: "name", value: match[0] });
      i += match[0].length;
      continue;
    }
    if ("+-*/^(),".includes(ch)) {
      if (ch === "*" && source[i + 1] === "*") {
        tokens.push({ kind: "op", value: "^" });
        i += 2;
        continue;
      }
      tokens.push({ kind: "op", value: ch });
      i += 1;
      continue;
    }
    throw new ExpressionSyntaxError(`Unexpected character ${JSON.stringify(ch)} at position ${i}`);
  }
  return insertImplicitMultiplication(tokens);
}

export function insertImplicitMultiplication(tokens: Token[]): Token[] {
  const output: Token[] = [];
  for (let index = 0; index < tokens.length; index += 1) {
    const current = tokens[index];
    const previous = output[output.length - 1];
    if (previous && current && shouldMultiply(previous, current)) {
      output.push({ kind: "op", value: "*" });
    }
    output.push(current);
  }
  return output;
}

function isValueEnd(token: Token): boolean {
  return token.kind === "number" || token.kind === "name" || (token.kind === "op" && token.value === ")");
}

function isValueStart(token: Token): boolean {
  return token.kind === "number" || token.kind === "name" || (token.kind === "op" && token.value === "(");
}

function shouldMultiply(left: Token, right: Token): boolean {
  if (left.kind === "name" && right.kind === "op" && right.value === "(") {
    return false;
  }
  return isValueEnd(left) && isValueStart(right);
}

export function parseExpression(source: string, allowedNames: string[]): AstNode {
  if (source.length === 0 || source.length > MAX_EXPRESSION_LENGTH) {
    throw new ExpressionSyntaxError("Expression length is invalid");
  }
  const tokens = tokenize(source);
  let index = 0;

  const peek = () => tokens[index];
  const consume = () => {
    const token = tokens[index];
    index += 1;
    return token;
  };

  const parseExpr = (): AstNode => {
    let node = parseTerm();
    while (peek()?.kind === "op" && (peek().value === "+" || peek().value === "-")) {
      const op = consume().value as "+" | "-";
      node = { type: "binary", op, left: node, right: parseTerm() };
    }
    return node;
  };

  const parseTerm = (): AstNode => {
    let node = parsePower();
    while (peek()?.kind === "op" && (peek().value === "*" || peek().value === "/")) {
      const op = consume().value as "*" | "/";
      node = { type: "binary", op, left: node, right: parsePower() };
    }
    return node;
  };

  const parsePower = (): AstNode => {
    const left = parseUnary();
    if (peek()?.kind === "op" && peek().value === "^") {
      consume();
      return { type: "binary", op: "^", left, right: parsePower() };
    }
    return left;
  };

  const parseUnary = (): AstNode => {
    if (peek()?.kind === "op" && peek().value === "-") {
      consume();
      return { type: "unary", op: "-", argument: parseUnary() };
    }
    return parsePrimary();
  };

  const parsePrimary = (): AstNode => {
    const token = peek();
    if (!token) {
      throw new ExpressionSyntaxError("Unexpected end of expression");
    }
    if (token.kind === "number") {
      consume();
      return { type: "number", value: token.value };
    }
    if (token.kind === "name") {
      consume();
      if (peek()?.kind === "op" && peek().value === "(") {
        if (!ALLOWED_FUNCTIONS.includes(token.value as AllowedFunction)) {
          throw new ExpressionSyntaxError(`Function is not allowed: ${token.value}`);
        }
        consume();
        const argument = parseExpr();
        const close = consume();
        if (close?.kind !== "op" || close.value !== ")") {
          throw new ExpressionSyntaxError("Expected closing parenthesis");
        }
        return { type: "call", name: token.value as AllowedFunction, argument };
      }
      if (![...allowedNames, ...ALLOWED_CONSTANTS].includes(token.value)) {
        throw new ExpressionSyntaxError(`Name is not allowed: ${token.value}`);
      }
      return { type: "name", name: token.value };
    }
    if (token.kind === "op" && token.value === "(") {
      consume();
      const inner = parseExpr();
      const close = consume();
      if (close?.kind !== "op" || close.value !== ")") {
        throw new ExpressionSyntaxError("Expected closing parenthesis");
      }
      return inner;
    }
    throw new ExpressionSyntaxError("Unexpected token");
  };

  const ast = parseExpr();
  if (index !== tokens.length) {
    throw new ExpressionSyntaxError(`Unexpected trailing input at token ${index}`);
  }
  assertDepth(ast, 0);
  return ast;
}

function assertDepth(node: AstNode, depth: number): void {
  if (depth > MAX_AST_DEPTH) {
    throw new ExpressionSyntaxError("Expression is too deeply nested");
  }
  if (node.type === "unary") {
    assertDepth(node.argument, depth + 1);
  } else if (node.type === "binary") {
    assertDepth(node.left, depth + 1);
    assertDepth(node.right, depth + 1);
  } else if (node.type === "call") {
    assertDepth(node.argument, depth + 1);
  }
}

const FN: Record<AllowedFunction, (n: number) => number> = {
  sin: Math.sin,
  cos: Math.cos,
  tan: Math.tan,
  asin: Math.asin,
  acos: Math.acos,
  atan: Math.atan,
  sinh: Math.sinh,
  cosh: Math.cosh,
  exp: Math.exp,
  log: Math.log10,
  ln: Math.log,
  sqrt: Math.sqrt,
  abs: Math.abs,
};

export function evaluateAst(node: AstNode, scope: Record<string, number>): number {
  switch (node.type) {
    case "number":
      return node.value;
    case "name":
      if (node.name === "pi") {
        return Math.PI;
      }
      if (node.name === "e") {
        return Math.E;
      }
      if (!(node.name in scope) || !Number.isFinite(scope[node.name])) {
        return Number.NaN;
      }
      return scope[node.name];
    case "unary":
      return -evaluateAst(node.argument, scope);
    case "binary": {
      const left = evaluateAst(node.left, scope);
      const right = evaluateAst(node.right, scope);
      switch (node.op) {
        case "+":
          return left + right;
        case "-":
          return left - right;
        case "*":
          return left * right;
        case "/":
          return right === 0 ? Number.NaN : left / right;
        case "^":
          return left ** right;
        default:
          return Number.NaN;
      }
    }
    case "call":
      return FN[node.name](evaluateAst(node.argument, scope));
    default:
      return Number.NaN;
  }
}

export function compileExpression(source: string, allowedNames: string[]) {
  const ast = parseExpression(source, allowedNames);
  return (scope: Record<string, number>) => evaluateAst(ast, scope);
}

export function astToLatex(node: AstNode): string {
  switch (node.type) {
    case "number":
      return String(node.value);
    case "name":
      return node.name === "pi" ? "\\pi" : node.name;
    case "unary":
      return `-${astToLatex(node.argument)}`;
    case "binary": {
      const left = astToLatex(node.left);
      const right = astToLatex(node.right);
      if (node.op === "/") {
        return `\\frac{${left}}{${right}}`;
      }
      if (node.op === "^") {
        return `{${left}}^{${right}}`;
      }
      if (node.op === "*") {
        return `${left} ${right}`;
      }
      return `${left} ${node.op} ${right}`;
    }
    case "call":
      return `\\${node.name === "ln" ? "ln" : node.name}{(${astToLatex(node.argument)})}`;
    default:
      return "";
  }
}

export function collectNames(node: AstNode): string[] {
  const names: string[] = [];
  const walk = (current: AstNode): void => {
    if (current.type === "name") {
      names.push(current.name);
      return;
    }
    if (current.type === "unary") {
      walk(current.argument);
      return;
    }
    if (current.type === "binary") {
      walk(current.left);
      walk(current.right);
      return;
    }
    if (current.type === "call") {
      walk(current.argument);
    }
  };
  walk(node);
  return names;
}
