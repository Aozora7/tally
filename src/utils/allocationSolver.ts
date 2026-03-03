// ── Allocation equation parser & linear solver ─────────────────────────────
//
// Parses equations like:
//   Total * 0.85 = (I500.DE + EXUS.DE + EMIM.AS)
//   (I500.DE + EXUS.DE) * 0.63 = I500.DE
//
// Each identifier is a ticker or "Total". All variables represent allocation
// fractions (0..1). "Total" is implicitly constrained to equal 1.
//
// Returns a Map<ticker, fraction> of target allocations.

// ── Tokenizer ────────────────────────────────────────────────────────────────

type TokenType = 'NUMBER' | 'IDENT' | 'PLUS' | 'TIMES' | 'EQUALS' | 'LPAREN' | 'RPAREN';

interface Token {
  type: TokenType;
  value: string;
}

function tokenize(input: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  while (i < input.length) {
    const ch = input[i]!;
    if (/\s/.test(ch)) {
      i++;
      continue;
    }
    if (ch === '(') {
      tokens.push({ type: 'LPAREN', value: '(' });
      i++;
    } else if (ch === ')') {
      tokens.push({ type: 'RPAREN', value: ')' });
      i++;
    } else if (ch === '+') {
      tokens.push({ type: 'PLUS', value: '+' });
      i++;
    } else if (ch === '*') {
      tokens.push({ type: 'TIMES', value: '*' });
      i++;
    } else if (ch === '=') {
      tokens.push({ type: 'EQUALS', value: '=' });
      i++;
    } else if (/[0-9.]/.test(ch)) {
      let num = '';
      while (i < input.length && /[0-9.]/.test(input[i]!)) {
        num += input[i]!;
        i++;
      }
      tokens.push({ type: 'NUMBER', value: num });
    } else if (/[A-Za-z_]/.test(ch)) {
      let ident = '';
      while (i < input.length && /[A-Za-z0-9_.]/.test(input[i]!)) {
        ident += input[i]!;
        i++;
      }
      tokens.push({ type: 'IDENT', value: ident });
    } else {
      throw new Error(`Unexpected character '${ch}' in equation`);
    }
  }
  return tokens;
}

// ── Linear expression ────────────────────────────────────────────────────────
// A linear expression is a map of variable → coefficient, e.g. { "AAPL": 0.5, "MSFT": 0.3 }

type LinExpr = Map<string, number>;

function exprAdd(a: LinExpr, b: LinExpr): LinExpr {
  const result = new Map(a);
  for (const [key, val] of b) {
    result.set(key, (result.get(key) ?? 0) + val);
  }
  return result;
}

function exprScale(a: LinExpr, scalar: number): LinExpr {
  const result = new Map<string, number>();
  for (const [key, val] of a) {
    result.set(key, val * scalar);
  }
  return result;
}

function exprSub(a: LinExpr, b: LinExpr): LinExpr {
  return exprAdd(a, exprScale(b, -1));
}

// ── Parser ───────────────────────────────────────────────────────────────────
// Grammar:
//   expr     = term (('+') term)*
//   term     = atom ('*' NUMBER | '*' atom)*
//   atom     = NUMBER | IDENT | '(' expr ')'
//
// A term can be: atom * number, number * atom, or atom alone.

class Parser {
  private tokens: Token[];
  private pos: number;

  constructor(tokens: Token[]) {
    this.tokens = tokens;
    this.pos = 0;
  }

  private peek(): Token | undefined {
    return this.tokens[this.pos];
  }

  private consume(expected?: TokenType): Token {
    const tok = this.tokens[this.pos];
    if (!tok) throw new Error('Unexpected end of equation');
    if (expected && tok.type !== expected) {
      throw new Error(`Expected ${expected} but got ${tok.type} ('${tok.value}')`);
    }
    this.pos++;
    return tok;
  }

  parseExpr(): LinExpr {
    let result = this.parseTerm();
    while (this.peek()?.type === 'PLUS') {
      this.consume('PLUS');
      result = exprAdd(result, this.parseTerm());
    }
    return result;
  }

  private parseTerm(): LinExpr {
    let result = this.parseAtom();
    while (this.peek()?.type === 'TIMES') {
      this.consume('TIMES');
      const next = this.parseAtom();
      // One side must be a pure number (scalar)
      const leftScalar = this.asScalar(result);
      const rightScalar = this.asScalar(next);
      if (rightScalar !== null) {
        result = exprScale(result, rightScalar);
      } else if (leftScalar !== null) {
        result = exprScale(next, leftScalar);
      } else {
        throw new Error('Multiplication is only supported between an expression and a number');
      }
    }
    return result;
  }

  private parseAtom(): LinExpr {
    const tok = this.peek();
    if (!tok) throw new Error('Unexpected end of equation');

    if (tok.type === 'NUMBER') {
      this.consume();
      const val = parseFloat(tok.value);
      if (isNaN(val)) throw new Error(`Invalid number: ${tok.value}`);
      // A standalone number is a constant — represented with empty key
      return new Map([['', val]]);
    }

    if (tok.type === 'IDENT') {
      this.consume();
      return new Map([[tok.value, 1]]);
    }

    if (tok.type === 'LPAREN') {
      this.consume('LPAREN');
      const expr = this.parseExpr();
      this.consume('RPAREN');
      return expr;
    }

    throw new Error(`Unexpected token: ${tok.type} ('${tok.value}')`);
  }

  private asScalar(expr: LinExpr): number | null {
    if (expr.size === 1 && expr.has('')) return expr.get('')!;
    return null;
  }

  get remaining(): number {
    return this.tokens.length - this.pos;
  }
}

// ── Equation parsing ─────────────────────────────────────────────────────────

interface LinearEquation {
  coefficients: Map<string, number>;
}

function parseEquation(input: string): LinearEquation {
  const tokens = tokenize(input);
  const eqIdx = tokens.findIndex((t) => t.type === 'EQUALS');
  if (eqIdx === -1) throw new Error('Equation must contain "="');

  const lhsTokens = tokens.slice(0, eqIdx);
  const rhsTokens = tokens.slice(eqIdx + 1);

  if (lhsTokens.length === 0) throw new Error('Left side of equation is empty');
  if (rhsTokens.length === 0) throw new Error('Right side of equation is empty');

  const lhsParser = new Parser(lhsTokens);
  const lhs = lhsParser.parseExpr();
  if (lhsParser.remaining > 0) throw new Error('Unexpected tokens after left side expression');

  const rhsParser = new Parser(rhsTokens);
  const rhs = rhsParser.parseExpr();
  if (rhsParser.remaining > 0) throw new Error('Unexpected tokens after right side expression');

  // lhs - rhs = 0
  return { coefficients: exprSub(lhs, rhs) };
}

// ── Gaussian elimination ─────────────────────────────────────────────────────

export interface AllocationResult {
  allocations: Map<string, number>;
  errors: string[];
}

export function solveAllocations(equationStrings: string[], knownTickers: string[]): AllocationResult {
  const errors: string[] = [];
  const equations: LinearEquation[] = [];

  for (const eqStr of equationStrings) {
    const trimmed = eqStr.trim();
    if (trimmed === '') continue;
    try {
      equations.push(parseEquation(trimmed));
    } catch (e) {
      errors.push(`"${trimmed}": ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  if (errors.length > 0) {
    return { allocations: new Map(), errors };
  }

  // Collect all variables mentioned in equations (excluding constants '')
  const variableSet = new Set<string>();
  for (const eq of equations) {
    for (const key of eq.coefficients.keys()) {
      if (key !== '') variableSet.add(key);
    }
  }

  // Validate identifiers: must be known tickers or "Total"
  const tickerSet = new Set(knownTickers);
  for (const v of variableSet) {
    if (v !== 'Total' && !tickerSet.has(v)) {
      errors.push(`Unknown ticker "${v}". Available: ${knownTickers.join(', ')}`);
    }
  }
  if (errors.length > 0) {
    return { allocations: new Map(), errors };
  }

  // Replace "Total" with sum of all referenced tickers
  // First, collect all tickers mentioned (excluding Total)
  const tickersInEquations = new Set<string>();
  for (const v of variableSet) {
    if (v !== 'Total') tickersInEquations.add(v);
  }

  // Substitute Total: replace coefficient of Total with equal coefficient for each ticker
  for (const eq of equations) {
    const totalCoeff = eq.coefficients.get('Total');
    if (totalCoeff !== undefined) {
      eq.coefficients.delete('Total');
      for (const ticker of tickersInEquations) {
        eq.coefficients.set(ticker, (eq.coefficients.get(ticker) ?? 0) + totalCoeff);
      }
    }
  }

  // Add constraint: sum of all tickers = 1
  const sumConstraint = new Map<string, number>();
  for (const ticker of tickersInEquations) {
    sumConstraint.set(ticker, 1);
  }
  sumConstraint.set('', -1); // = 1 → sum - 1 = 0
  equations.push({ coefficients: sumConstraint });

  // Build variable list (stable order)
  const variables = Array.from(tickersInEquations).sort();
  const n = variables.length;
  const m = equations.length;

  if (m < n) {
    errors.push(`Underdetermined system: ${m} equations for ${n} unknowns. Add more rules.`);
    return { allocations: new Map(), errors };
  }

  // Build augmented matrix [A | b] where Ax = b, but we stored as Ax + constant = 0
  // So b = -constant
  const matrix: number[][] = [];
  for (const eq of equations) {
    const row: number[] = [];
    for (const v of variables) {
      row.push(eq.coefficients.get(v) ?? 0);
    }
    row.push(-(eq.coefficients.get('') ?? 0));
    matrix.push(row);
  }

  // Gaussian elimination with partial pivoting
  let pivotRow = 0;
  for (let col = 0; col < n && pivotRow < m; col++) {
    // Find pivot
    let maxVal = Math.abs(matrix[pivotRow]![col]!);
    let maxRow = pivotRow;
    for (let row = pivotRow + 1; row < m; row++) {
      const val = Math.abs(matrix[row]![col]!);
      if (val > maxVal) {
        maxVal = val;
        maxRow = row;
      }
    }

    if (maxVal < 1e-12) continue; // Skip zero column

    // Swap rows
    if (maxRow !== pivotRow) {
      [matrix[pivotRow], matrix[maxRow]] = [matrix[maxRow]!, matrix[pivotRow]!];
    }

    // Eliminate below
    const pivotVal = matrix[pivotRow]![col]!;
    for (let row = pivotRow + 1; row < m; row++) {
      const factor = matrix[row]![col]! / pivotVal;
      for (let j = col; j <= n; j++) {
        matrix[row]![j] = matrix[row]![j]! - factor * matrix[pivotRow]![j]!;
      }
    }

    pivotRow++;
  }

  // Check for inconsistency (row with all-zero coefficients but non-zero constant)
  for (let row = pivotRow; row < m; row++) {
    const rhs = Math.abs(matrix[row]![n]!);
    const allZero = variables.every((_, col) => Math.abs(matrix[row]![col]!) < 1e-12);
    if (allZero && rhs > 1e-10) {
      errors.push('Inconsistent system: equations have no solution. Check your rules.');
      return { allocations: new Map(), errors };
    }
  }

  if (pivotRow < n) {
    errors.push(`Underdetermined system: not enough independent equations. Add more rules.`);
    return { allocations: new Map(), errors };
  }

  // Back substitution
  const solution = new Array<number>(n).fill(0);
  for (let row = n - 1; row >= 0; row--) {
    let sum = matrix[row]![n]!;
    for (let col = row + 1; col < n; col++) {
      sum -= matrix[row]![col]! * solution[col]!;
    }
    solution[row] = sum / matrix[row]![row]!;
  }

  // Build result and validate
  const allocations = new Map<string, number>();
  for (let i = 0; i < n; i++) {
    const val = solution[i]!;
    if (val < -1e-10) {
      errors.push(`Negative allocation for ${variables[i]}: ${(val * 100).toFixed(2)}%. Check your rules.`);
    }
    allocations.set(variables[i]!, Math.max(0, val));
  }

  if (errors.length > 0) {
    return { allocations: new Map(), errors };
  }

  // Verify allocations sum to ~1
  const total = Array.from(allocations.values()).reduce((s, v) => s + v, 0);
  if (Math.abs(total - 1) > 1e-6) {
    errors.push(`Allocations sum to ${(total * 100).toFixed(2)}% instead of 100%. Check your rules.`);
    return { allocations: new Map(), errors };
  }

  return { allocations, errors };
}

// ── Rebalance recommendation ─────────────────────────────────────────────────

export interface RebalanceRecommendation {
  ticker: string;
  action: 'Buy' | 'Sell';
  amount: number; // in cents (positive)
  resultingDeviations: Map<string, number>; // ticker → deviation %
  totalDeviation: number; // sum of squared deviations
}

export function recommendRebalance(
  holdings: { ticker: string; value: number }[],
  targetAllocations: Map<string, number>,
  depositCents: number
): RebalanceRecommendation | null {
  if (holdings.length === 0 || targetAllocations.size === 0 || depositCents === 0) return null;

  const totalValue = holdings.reduce((s, h) => s + h.value, 0);
  const newTotal = totalValue + depositCents;
  if (newTotal <= 0) return null;

  let bestRecommendation: RebalanceRecommendation | null = null;
  let bestScore = Infinity;

  for (const holding of holdings) {
    if (!targetAllocations.has(holding.ticker)) continue;

    // Simulate adding/removing the full deposit amount to this security
    const deviations = new Map<string, number>();
    let score = 0;

    for (const h of holdings) {
      const target = targetAllocations.get(h.ticker) ?? 0;
      const newValue = h.ticker === holding.ticker ? h.value + depositCents : h.value;
      const newPct = newValue / newTotal;
      const deviation = newPct - target;
      deviations.set(h.ticker, deviation);
      score += deviation * deviation;
    }

    if (score < bestScore) {
      bestScore = score;
      bestRecommendation = {
        ticker: holding.ticker,
        action: depositCents > 0 ? 'Buy' : 'Sell',
        amount: Math.abs(depositCents),
        resultingDeviations: deviations,
        totalDeviation: score,
      };
    }
  }

  return bestRecommendation;
}
