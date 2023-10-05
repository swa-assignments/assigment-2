/* import { describe, it, expect, beforeEach } from '@jest/globals'
import { Generator, Position, Board, BoardEvent } from '../src/board'

class CyclicGenerator implements Generator<string> {
    private sequence: string
    private index: number

    constructor(sequence: string) {
        this.sequence = sequence
        this.index = 0
    }

    next(): string {
        const n = this.sequence.charAt(this.index)
        this.index = (this.index + 1) % this.sequence.length
        return n
    }
}

class GeneratorFake<T> implements Generator<T> {
    private upcoming: T[]

    constructor(...upcoming: T[]) {
        this.upcoming = upcoming
    }

    prepare(...e: T[]) {
        this.upcoming.push(...e)
    }

    next(): T {
        let v = this.upcoming.shift()
        if (v === undefined)
            throw new Error('Empty queue')
        else
            return v
    }

}

function require(board: Board<String>) {
    function index({row, col}: Position) {
        return row * board.width + col
    }

    function toEqual(...tiles: String[]) {
        board.positions().forEach(p => expect(board.piece(p)).toEqual(tiles[index(p)]) );
    }

    function toMatch(...tiles: String[]) {
        const matched: (String | undefined)[] = []
        board.positions().forEach(p => {
            if (tiles[index(p)] === '*') {
                matched.push(board.piece(p))
            } else {
                expect(board.piece(p)).toEqual(tiles[index(p)])
            }
        })

        function withPieces(...pieces: String[]) {
            expect(pieces.sort()).toEqual(matched.sort())
        }

        return { withPieces }
    }

    return { toEqual, toMatch }
}

describe("Board", () => {
    describe("Initial board", () => {
        const generator = new CyclicGenerator('ABC')
        const board = new Board(generator, 2, 3)

        it("has the given width", () => {
            expect(board.width).toEqual(2)
        })

        it("has the given height", () => {
            expect(board.height).toEqual(3)
        })

        it("has row * col positions", () => {
            const positions = [{row: 0, col: 0}, {row: 0, col: 1},
                               {row: 1, col: 0}, {row: 1, col: 1},
                               {row: 2, col: 0}, {row: 2, col: 1}]
            expect(board.positions()).toEqual(positions)
        })

        it("contains the generated elements", () => {
            expect(board.piece({row: 0, col: 0})).toEqual('A')
            expect(board.piece({row: 1, col: 1})).toEqual('A')
            expect(board.piece({row: 0, col: 1})).toEqual('B')
            expect(board.piece({row: 2, col: 0})).toEqual('B')
            expect(board.piece({row: 1, col: 0})).toEqual('C')
            expect(board.piece({row: 2, col: 1})).toEqual('C')
        })

        it("is undefined outside of the board", () => {
            expect(board.piece({ row: 0, col: -1})).toBeUndefined()
            expect(board.piece({ row: -1, col: 0})).toBeUndefined()
            expect(board.piece({ row: 0, col: 2})).toBeUndefined()
            expect(board.piece({ row: 3, col: 0})).toBeUndefined()
        })
    })

    describe("moves", () => {
        describe("valid moves", () => {
            const generator = new GeneratorFake<String>(
                'A', 'B', 'A', 'C',
                'D', 'C', 'A', 'C',
                'D', 'A', 'D', 'D',
                'C', 'C', 'D', 'C'
            )
            const board = new Board(generator, 4, 4)
            describe("valid vertical moves", () => {
                it("recognizes vertical moves that moves first piece to a horizontal match as valid", () => {
                    expect(board.canMove({row: 2, col: 1}, {row: 0, col: 1})).toEqual(true)
                })
                it("recognizes vertical moves that moves second piece to a horizontal match as valid", () => {
                    expect(board.canMove({row: 0, col: 1}, {row: 2, col: 1})).toEqual(true)
                })
                it("recognizes vertical moves that moves first piece to a vertical match as valid", () => {
                    expect(board.canMove({row: 3, col: 3}, {row: 2, col: 3})).toEqual(true)
                })
                it("recognizes vertical moves that moves second piece to a vertical match as valid", () => {
                    expect(board.canMove({row: 2, col: 3}, {row: 3, col: 3})).toEqual(true)
                })
            })

            describe("valid horizontal moves", () => {
                it("recognizes horizontal moves that moves first piece to a horizontal match as valid", () => {
                    expect(board.canMove({row: 3, col: 3}, {row: 3, col: 2})).toEqual(true)
                })
                it("recognizes horizontal moves that moves second piece to a horizontal match as valid", () => {
                    expect(board.canMove({row: 3, col: 2}, {row: 3, col: 3})).toEqual(true)
                })
                it("recognizes horizontal moves that moves first piece to a vertical match as valid", () => {
                    expect(board.canMove({row: 1, col: 0}, {row: 1, col: 2})).toEqual(true)
                })
                it("recognizes horizontal moves that moves second piece to a vertical match as valid", () => {
                    expect(board.canMove({row: 1, col: 2}, {row: 1, col: 0})).toEqual(true)
                })
            })

            describe("invalid moves", () => {
                it("does not allow moves that make no matches", () => {
                    expect(board.canMove({row: 0, col: 0}, {row: 0, col: 0})).toEqual(false)
                })
                it("does not count the piece that is moved away", () => {
                    expect(board.canMove({row: 1, col: 1}, {row: 2, col: 1})).toEqual(false)
                })
                it("recognizes moves on different rows and columns as invalid", () => {
                    expect(board.canMove({row: 0, col: 3}, {row: 1, col: 2})).toEqual(false)
                })
                it("recognizes out-of-bounds moves as invalid", () =>{
                    expect(board.canMove({row: 3, col: 3}, {row: -1, col: 3})).toEqual(false)
                    expect(board.canMove({row: 3, col: 3}, {row: 3, col: -1})).toEqual(false)
                    expect(board.canMove({row: 2, col: 0}, {row: 2, col: 4})).toEqual(false)
                })
            })
        })

        describe("making moves", () => {
            let events: BoardEvent<String>[]
            let generator: GeneratorFake<String>
            let board: Board<String>

            beforeEach(() => {
                events = []
                generator = new GeneratorFake<String>(
                    'A', 'B', 'A', 'C', 'F',
                    'D', 'B', 'C', 'C', 'A',
                    'D', 'A', 'C', 'B', 'F',
                    'C', 'D', 'D', 'C', 'D'
                )
                board = new Board(generator, 5, 4)
                board.addListener(e => events.push(e))
            })

            it("moves the pieces during a move", () => {
                generator.prepare('C', 'D', 'A')
                board.move({row: 2, col: 1}, {row: 0, col: 1})
                expect(board.piece({row: 2, col: 1})).toEqual('B')
            })
            it("finds single horizontal match when moving first piece to a match", () => {
                generator.prepare('C', 'D', 'A')
                board.move({row: 2, col: 1}, {row: 0, col: 1})
                expect(events).toContainEqual({kind: 'Match', match: {matched: 'A', positions: [{row: 0, col: 0}, {row: 0, col: 1}, {row: 0, col: 2}]}})
            })
            it("finds single horizontal match when moving second piece to a match", () => {
                generator.prepare('C', 'D', 'A')
                board.move({row: 0, col: 1}, {row: 2, col: 1})
                expect(events).toContainEqual({kind: 'Match', match: {matched: 'A', positions: [{row: 0, col: 0}, {row: 0, col: 1}, {row: 0, col: 2}]}})
            })
            it("finds single vertical match when moving first piece to a match", () => {
                generator.prepare('C', 'D', 'A')
                board.move({row: 3, col: 3}, {row: 2, col: 3})
                expect(events).toContainEqual({kind: 'Match', match: {matched: 'C', positions: [{row: 0, col: 3}, {row: 1, col: 3}, {row: 2, col: 3}]}})
            })
            it("finds single vertical match when moving second piece to a match", () => {
                generator.prepare('C', 'D', 'A')
                board.move({row: 2, col: 3}, {row: 3, col: 3})
                expect(events).toContainEqual({kind: 'Match', match: {matched: 'C', positions: [{row: 0, col: 3}, {row: 1, col: 3}, {row: 2, col: 3}]}})
            })
            it("fires multiple events on horz + vert matches", () => {
                generator.prepare('G', 'H', 'I')
                generator.prepare('J', 'K', 'L')
                generator.prepare('J', 'K', 'L')
                board.move({row: 3, col: 4}, {row: 3, col: 0})
                expect(events).toContainEqual(
                    {kind: 'Match', match: {matched: 'D', positions: [{row: 3, col: 0}, {row: 3, col: 1}, {row: 3, col: 2}]}}
                )
                expect(events).toContainEqual(
                    {kind: 'Match', match: {matched: 'D', positions: [{row: 1, col: 0}, {row: 2, col: 0}, {row: 3, col: 0}]}},
                )
            })
            it("fires multiple events when both pieces make new matches", () => {
                generator.prepare('C', 'D', 'A')
                generator.prepare('B', 'A', 'B')
                board.move({row: 3, col: 2}, {row: 3, col: 0})
                expect(events).toContainEqual(
                    {kind: 'Match', match: {matched: 'C', positions: [{row: 1, col: 2}, {row: 2, col: 2}, {row: 3, col: 2}]}}
                )
                expect(events).toContainEqual(
                    {kind: 'Match', match: {matched: 'D', positions: [{row: 1, col: 0}, {row: 2, col: 0}, {row: 3, col: 0}]}},
                )
            })
            it("doesn't swap on illegal moves", () => {
                generator.prepare('C', 'D', 'A', 'C', 'D', 'A', 'C', 'D', 'A')
                board.move({row: 1, col: 1}, {row: 2, col: 1})
                expect(board.piece({row: 1, col: 1})).toEqual('B')
                board.move({row: 0, col: 3}, {row: 1, col: 2})
                expect(board.piece({row: 0, col: 3})).toEqual('C')
                board.move({row: 3, col: 3}, {row: -1, col: 3})
                expect(board.piece({row: 3, col: 3})).toEqual('C')
            })
            it("doesn't fire events on illegal moves", () => {
                generator.prepare('C', 'D', 'A', 'C', 'D', 'A', 'C', 'D', 'A')
                board.move({row: 0, col: 0}, {row: 0, col: 0})
                board.move({row: 1, col: 1}, {row: 2, col: 1})
                board.move({row: 0, col: 3}, {row: 1, col: 2})
                board.move({row: 3, col: 3}, {row: -1, col: 3})
                expect(events).toEqual([])
            })
        })

        describe("replacing tiles", () => {
            let generator: GeneratorFake<String>
            let board: Board<String>

            beforeEach(() => {
                generator = new GeneratorFake<String>(
                    'A', 'B', 'A',
                    'D', 'B', 'C',
                    'D', 'A', 'C',
                    'C', 'D', 'D',
                )
                board = new Board(generator, 3, 4)
            })

            it("replaces missing top row with generated tiles", () => {
                generator.prepare('B', 'C', 'D')
                board.move({row: 0, col: 1}, {row: 2, col: 1})
                require(board).toMatch(
                    '*', '*', '*',
                    'D', 'B', 'C',
                    'D', 'B', 'C',
                    'C', 'D', 'D',
                ).withPieces('B', 'C', 'D')
            })
            it("shifts tiles down before replacing", () => {
                generator.prepare('B', 'C', 'D')
                board.move({row: 2, col: 0}, {row: 3, col: 0})
                require(board).toMatch(
                    '*', '*', '*',
                    'A', 'B', 'A',
                    'D', 'B', 'C',
                    'C', 'A', 'C',
                ).withPieces('B', 'C', 'D')
            })
            it("shifts tiles down before replacing multiple matches", () => {
                generator.prepare('D', 'B', 'C', 'A', 'B', 'A')
                board.move({row: 3, col: 0}, {row: 3, col: 2})
                require(board).toMatch(
                    '*', 'B', '*',
                    '*', 'B', '*',
                    '*', 'A', '*',
                    'A', 'D', 'A',
                ).withPieces('A', 'A', 'B', 'B', 'C', 'D')
            })
            it("only deletes a double match once", () => {
                generator = new GeneratorFake<String>(
                    'D', 'B', 'A',
                    'D', 'B', 'C',
                    'B', 'A', 'B',
                    'C', 'B', 'D',
                )
                board = new Board(generator, 3, 4)
                generator.prepare('D', 'C', 'B', 'B', 'A')
                board.move({row: 0, col: 1}, {row: 2, col: 1})
                require(board).toMatch(
                    '*', '*', '*',
                    'D', '*', 'A',
                    'D', '*', 'C',
                    'C', 'A', 'D',
                ).withPieces('A', 'B', 'B', 'C', 'D')
            })
        })

        describe("Refill event", () => {
            let events: BoardEvent<String>[]
            let generator: GeneratorFake<String>
            let board: Board<String>

            beforeEach(() => {
                events = []
                generator = new GeneratorFake<String>(
                    'A', 'B', 'A', 'C', 'F',
                    'D', 'B', 'C', 'C', 'A',
                    'D', 'A', 'C', 'B', 'F',
                    'C', 'D', 'D', 'C', 'D'
                )
                board = new Board(generator, 5, 4)
                board.addListener(e => events.push(e))
            })

          it("fires refill event after shifting", () => {
                generator.prepare('B', 'C', 'D')
                board.move({row: 0, col: 1}, {row: 2, col: 1})
                expect(events[events.length - 1]).toEqual({ kind: 'Refill' })
            })
            it("fires nothing with no matches", () => {
                board.move({row: 0, col: 0}, {row: 0, col: 0})
                board.move({row: 1, col: 1}, {row: 2, col: 1})
                board.move({row: 0, col: 3}, {row: 1, col: 2})
                board.move({row: 3, col: 3}, {row: -1, col: 3})
                expect(events).toEqual([])
            })
        })

        describe("Cascading", () => {
            let events: BoardEvent<String>[]
            let generator: GeneratorFake<String>
            let board: Board<String>

            beforeEach(() => {
                events = []
                generator = new GeneratorFake<String>(
                    'A', 'B', 'A',
                    'D', 'B', 'C',
                    'D', 'A', 'C',
                    'C', 'D', 'D',
                )
                board = new Board(generator, 3, 4)
                board.addListener(e => events.push(e))
            })

            it("registers if refilling brings new matches", () => {
                generator.prepare('B', 'C', 'C')
                generator.prepare('A', 'A', 'D')
                board.move({row: 0, col: 1}, {row: 2, col: 1})
                expect(events).toEqual([
                    {kind: 'Match', match: {matched: 'A', positions: [{row: 0, col: 0}, {row: 0, col: 1}, {row: 0, col: 2}]}},
                    {kind: 'Refill'},
                    {kind: 'Match', match: {matched: 'C', positions: [{row: 0, col: 2}, {row: 1, col: 2}, {row: 2, col: 2}]}},
                    {kind: 'Refill'},
                ])
            })

            it("iterates until there are no new matches", () => {
                generator.prepare('B', 'C', 'C')
                generator.prepare('A', 'A', 'A')
                generator.prepare('A', 'A', 'D')
                board.move({row: 0, col: 1}, {row: 2, col: 1})
                expect(events).toEqual([
                    {kind: 'Match', match: {matched: 'A', positions: [{row: 0, col: 0}, {row: 0, col: 1}, {row: 0, col: 2}]}},
                    {kind: 'Refill'},
                    {kind: 'Match', match: {matched: 'C', positions: [{row: 0, col: 2}, {row: 1, col: 2}, {row: 2, col: 2}]}},
                    {kind: 'Refill'},
                    {kind: 'Match', match: {matched: 'A', positions: [{row: 0, col: 2}, {row: 1, col: 2}, {row: 2, col: 2}]}},
                    {kind: 'Refill'},
                ])
            })
        })
    })
}) */

export type Generator<T> = { next: () => T }

export type Position = {
  row: number,
  col: number
}

export type Match<T> = {
  matched: T,
  positions: Position[]
}

export type BoardEvent<T> = {
  kind: 'Move',
  match: Match<T>
} | {
  kind: 'Refill'
}

export class Board<T> {
  readonly width: number
  readonly height: number
  private listeners: ((event: BoardEvent<T>) => void)[] = []
  private generator: Generator<T>
  private grid: T[][] = []

  constructor(generator: Generator<T>, width: number, height: number) {
    this.width = width
    this.height = height
    this.grid = Array.from({ length: height }, () => Array.from({ length: width }, () => generator.next()))
    this.generator = generator
  }

  addListener(listener: (event: BoardEvent<T>) => void) {
    this.listeners.push(listener)
  }

  positions(): Position[] {
    const positions: Position[] = []
    for (let row = 0; row < this.height; row++) {
      for (let col = 0; col < this.width; col++) {
        positions.push({ row, col })
      }
    }
    return positions
  }

  piece(p: Position): T | undefined {
    if (p.row < 0 || p.row >= this.height || p.col < 0 || p.col >= this.width) {
      return undefined
    }
    return this.grid[p.row][p.col]
  }

  canMove(first: Position, second: Position): boolean {
    if (first.row < 0 || first.row >= this.height || first.col < 0 || first.col >= this.width) {
      return false
    }
    if (second.row < 0 || second.row >= this.height || second.col < 0 || second.col >= this.width) {
      return false
    }
    if (first.row === second.row && first.col === second.col) {
      return false
    }
    if (first.row !== second.row && first.col !== second.col) {
      return false
    }
    const firstPiece = this.piece(first)
    const secondPiece = this.piece(second)
    if (firstPiece === undefined || secondPiece === undefined) {
      return false
    }
    const gridCopy = this.grid.map(row => row.map(piece => piece))
    gridCopy[first.row][first.col] = secondPiece
    gridCopy[second.row][second.col] = firstPiece
    const matches = this.findMatches(gridCopy)
    return matches.length > 0
  }

  findMatches(grid: T[][]): Match<T>[] {
    const matches: Match<T>[] = []

    // Check for horizontal matches
    for (let row = 0; row < this.height; row++) {
      let matchLength = 1
      for (let col = 0; col < this.width; col++) {
        if (col === this.width - 1 || grid[row][col] !== grid[row][col + 1]) {
          if (matchLength >= 3) {
            matches.push({ matched: grid[row][col], positions: Array.from({ length: matchLength }, (_, i) => ({ row, col: col - i })) })
          }
          matchLength = 1
        } else {
          matchLength++
        }
      }
    }

    // Check for vertical matches
    for (let col = 0; col < this.width; col++) {
      let matchLength = 1
      for (let row = 0; row < this.height; row++) {
        if (row === this.height - 1 || grid[row][col] !== grid[row + 1][col]) {
          if (matchLength >= 3) {
            matches.push({ matched: grid[row][col], positions: Array.from({ length: matchLength }, (_, i) => ({ row: row - i, col })) })
          }
          matchLength = 1
        } else {
          matchLength++
        }
      }
    }

    return matches
  }

  move(first: Position, second: Position) {
    if (!this.canMove(first, second)) {
        return;
    }

    const firstPiece = this.piece(first);
    const secondPiece = this.piece(second);

    if (firstPiece === undefined || secondPiece === undefined) {
        return;
    }

    // Swap the pieces in the grid
    this.grid[first.row][first.col] = secondPiece;
    this.grid[second.row][second.col] = firstPiece;

    // Clone the grid for matching
    const gridCopy = this.grid.map(row => [...row]);

    // Find and process matches
    const matches: Match<T>[] = [];

    // Check horizontal matches
    for (let row = 0; row < this.height; row++) {
        const horizontalMatches = this.findHorizontalMatches(gridCopy, row);
        matches.push(...horizontalMatches);
    }

    // Check vertical matches
    for (let col = 0; col < this.width; col++) {
        const verticalMatches = this.findVerticalMatches(gridCopy, col);
        matches.push(...verticalMatches);
    }

    // Remove duplicate matches
    const uniqueMatches = this.getUniqueMatches(matches);

    // Notify listeners about the matches
    if (uniqueMatches.length > 0) {
        const { matched, positions } = uniqueMatches[0];
        this.listeners.forEach(listener => listener({ kind: 'Move', match: { matched, positions } }));
    } else {
        this.listeners.forEach(listener => listener({ kind: 'Move', match: uniqueMatches[0] }));
    }


    // Remove matched pieces and shift pieces down
    this.removeAndShift(gridCopy, uniqueMatches);

    // Notify listeners about the message
    this.listeners.forEach(listener => listener({ kind: 'Refill' }));

    // Refill the board
    this.refill();
}


  refill() {
    const gridCopy = this.grid.map(row => row.map(piece => piece))
    const matches = this.findMatches(gridCopy)
    if (matches.length === 0) {
      return
    }
    const positions = matches.flatMap(match => match.positions)
    const pieces = positions.map(position => this.generator.next())
    this.listeners.forEach(listener => listener({ kind: 'Refill' }))
    this.listeners.forEach(listener => listener({ kind: 'Move', match: matches[0] }))
    }

    private findHorizontalMatches(grid: T[][], row: number): Match<T>[] {
        const matches: Match<T>[] = [];
        let matchLength = 1;
        for (let col = 0; col < this.width; col++) {
            if (col === this.width - 1 || grid[row][col] !== grid[row][col + 1]) {
                if (matchLength >= 3) {
                    const matchedPiece = grid[row][col];
                    const positions = Array.from({ length: matchLength }, (_, i) => ({ row, col: col - i }));
                    matches.push({ matched: matchedPiece, positions });
                }
                matchLength = 1;
            } else {
                matchLength++;
            }
        }
        return matches;
    }

    private findVerticalMatches(grid: T[][], col: number): Match<T>[] {
        const matches: Match<T>[] = [];
        let matchLength = 1;
        for (let row = 0; row < this.height; row++) {
            if (row === this.height - 1 || grid[row][col] !== grid[row + 1][col]) {
                if (matchLength >= 3) {
                    const matchedPiece = grid[row][col];
                    const positions = Array.from({ length: matchLength }, (_, i) => ({ row: row - i, col }));
                    matches.push({ matched: matchedPiece, positions });
                }
                matchLength = 1;
            } else {
                matchLength++;
            }
        }
        return matches;
    }

    private getUniqueMatches(matches: Match<T>[]): Match<T>[] {
        const uniqueMatches: Match<T>[] = [];
        const seenMatches = new Set<string>();

        for (const match of matches) {
            const matchString = JSON.stringify(match.positions);
            if (!seenMatches.has(matchString)) {
                seenMatches.add(matchString);
                uniqueMatches.push(match);
            }
        }

        return uniqueMatches;
    }

    private removeAndShift(grid: T[][], matches: Match<T>[]) {
        for (const match of matches) {
            for (const position of match.positions) {
                grid[position.row][position.col] = undefined as any;
            }
        }

        // Shift pieces down
        for (let col = 0; col < this.width; col++) {
            const filledPositions = [];
            for (let row = this.height - 1; row >= 0; row--) {
                if (grid[row][col] !== undefined) {
                    filledPositions.push(grid[row][col]);
                }
            }
            filledPositions.reverse();
            for (let row = this.height - 1; row >= 0; row--) {
                grid[row][col] = filledPositions.pop() || undefined;
            }
        }
    }

}
