export type Generator<T> = { next: () => T };

export type Position = {
    row: number;
    col: number;
};

export type Match<T> = {
    matched: T;
    positions: Position[];
};

export type Board<T> = {
    width: number;
    height: number;
    board: T[][];
};

export type Effect<T> = {
    kind: string;
    match: Match<T>;
};

export type MoveResult<T> = {
    board: Board<T>;
    effects: Effect<T>[];
};

export function create<T>(
    generator: Generator<T>,
    width: number,
    height: number
): Board<T> {
    const board = createArray(width, height, () => generator.next());

    return {
        width,
        height,
        board,
    };
}

export function piece<T>(board: Board<T>, p: Position): T | undefined {

    return board.board?.[p.row]?.[p.col];
}

export function positions<T>(board: Board<T>): Position[] {
    const positions: Position[] = [];

    board.board.forEach((row, rowIndex) => {
        row.forEach((_, colIndex) => {
            positions.push({ row: rowIndex, col: colIndex });
        });
    });

    return positions;
}


export function canMove<T>(
    board: Board<T>,
    first: Position,
    second: Position
  ): boolean {
    const sameRow = first.row === second.row;
    const sameColumn = first.col === second.col;
  
    if (
      !isValidIndex(first.row, board.height) ||
      !isValidIndex(first.col, board.width) ||
      !isValidIndex(second.row, board.height) ||
      !isValidIndex(second.col, board.width)
    ) {
      return false;
    }
  
    return (sameRow && !sameColumn) || (!sameRow && sameColumn);
  }

export function move<T>(
    generator: Generator<T>,
    board: Board<T>,
    first: Position,
    second: Position
): MoveResult<T> {
    let effects: Effect<T>[] = [];

    if (!canMove(board, first, second)) {
        return;
    }

    swap(board, first, second);
    checkMatchesRecursive(board, generator, effects);

    return {
        board,
        effects,
    };
}

function checkMatchesRecursive<T>(
    board: Board<T>,
    generator: Generator<T>,
    effects: Effect<T>[],
    hasMatches = true
) {
    if (!hasMatches) {
        return;
    }

    for (const match of getMatches(board)) {
        const matchEvent = createMatchEvent(match);
        const refillEvent = createRefillEvent<T>();

        effects.push(matchEvent);
        effects.push(refillEvent);

        deleteMatch(board, match);
    }

    movePiecesDown(board);
    replaceEmptyPieces(board, generator);

    const newMatches = getMatches(board);
    checkMatchesRecursive(board, generator, effects, newMatches.length > 0);
}

function createMatchEvent<T>(match: Match<T>): Effect<T> {
    return {
        kind: "Match",
        match,
    };
}

function createRefillEvent<T>(): Effect<T> {
    return {
        kind: "Refill",
        match: null
    };
}

function replaceEmptyPieces<T>(board: Board<T>, generator: Generator<T>) {
    for (let y = board.height - 1; y >= 0; y--) {
        for (let x = 0; x < board.width; x++) {
            const piece = board.board[y][x];

            if (piece == null) {
                board.board[y][x] = generator.next();
            }
        }
    }
}

function movePiecesDown<T>(board: Board<T>) {
    for (let x = 0; x < board.width; x++) {
        let spanY = 0;

        let y = board.height - 1;

        while (y >= 0) {
            let piece = board.board[y][x];

            if (spanY > 0) {
                if (piece != null) {
                    board.board[spanY][x] = piece;
                    board.board[y][x] = null;

                    y = spanY;

                    spanY = 0;
                }
            } else if (piece == null) {
                if (spanY == 0) {
                    spanY = y;
                }
            }

            y = y - 1;
        }
    }
}

function getMatches<T>(board: Board<T>) {
    const horizontalMatches = getMatchesHorizontally(board);
    const verticalMatches = getMatchesVertically(board);
    return [...horizontalMatches, ...verticalMatches];
}

function deleteMatch<T>(board: Board<T>, match: Match<T>) {
    for (const position of match.positions) {
        setPiece(board, position, null);
    }
}

function getMatchesHorizontally<T>(board: Board<T>) {
    let matches: Match<T>[] = [];
    let matchesCount = 1;

    for (let y = 0; y < board.height; y++) {
        let piece = board.board[y][0];

        matchesCount = 1;

        // from 1 because the first position is stored in piece
        for (let x = 1; x < board.width; x++) {
            if (board.board[y][x] == piece) {
                matchesCount++;
            } else {
                piece = board.board[y][x];
                matchesCount = 1;
            }

            if (matchesCount >= 3) {
                let positions: Position[] = [];

                for (let x2 = x - matchesCount + 1; x2 <= x; x2++) {
                    positions.push({ col: x2, row: y });
                }

                matches.push({
                    matched: piece,
                    positions: positions,
                });
            }
        }
    }

    return matches;
}

function getMatchesVertically<T>(board: Board<T>) {
    let matches: Match<T>[] = [];
    let matchesCount = 1;

    for (let x = 0; x < board.width; x++) {
        let piece = board.board[0][x];

        matchesCount = 1;

        // from 1 because the first position is stored in piece
        for (let y = 1; y < board.height; y++) {
            if (board.board[y][x] == piece) {
                matchesCount++;
            } else {
                piece = board.board[y][x];
                matchesCount = 1;
            }

            if (matchesCount >= 3) {
                let positions: Position[] = [];

                for (let y2 = y - matchesCount + 1; y2 <= y; y2++) {
                    positions.push({ col: x, row: y2 });
                }

                matches.push({
                    matched: piece,
                    positions,
                });
            }
        }
    }

    return matches;
}

function swap<T>(board: Board<T>, first: Position, second: Position) {
    if (!canMove(board, first, second)) {
        return board;
    }

    const temp = piece(board, first);
    setPiece(board, first, piece(board, second));
    setPiece(board, second, temp);

    return board;
}

function setPiece<T>(board: Board<T>, pos: Position, value: T) {
    board.board[pos.row][pos.col] = value;
    return board;
}

// Generate board with random elements in it
// Create 2 two dimensional array
// Fill it in with values
function createArray<T>(width: number, height: number, getValue: () => T) {
    return [...Array(height)].map(() => {
        return [...Array(width)].map(() => getValue());
    });
}

function isValidIndex(positionIndex: number, boardIndex: number): boolean {
    return positionIndex >= 0 && positionIndex < boardIndex;
}