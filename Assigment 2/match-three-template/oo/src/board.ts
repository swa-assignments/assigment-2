export type Generator<T> = {
    next: () => T;
  };

  export type Position = {
    row: number;
    col: number;
  };

  export type Match<T> = {
    matched: T;
    positions: Position[];
  };

  export type BoardEvent<T> = {
    kind: string; // e.g., 'move', 'swap', 'match', 'refill', etc.
    match?: Match<T>; // Optional match information.
  };

  export type BoardListener<T> = (event: BoardEvent<T>) => void;

  export class Board<T> {
    readonly width: number;
    readonly height: number;
    private grid: T[][];
    private listeners: BoardListener<T>[] = [];
    private generator: Generator<T>; // Declare the generator property here

    constructor(generator: Generator<T>, width: number, height: number) {
      this.width = width;
      this.height = height;
      this.grid = Array.from({ length: height }, () =>
        Array.from({ length: width }, () => generator.next())
      );
      this.generator = generator; // Initialize the generator property
    }

    addListener(listener: BoardListener<T>) {
      this.listeners.push(listener);
    }

    private isValidPosition(position: Position): boolean {
      return (
        position.row >= 0 &&
        position.row < this.height &&
        position.col >= 0 &&
        position.col < this.width
      );
    }

    private hasMatchAt(position: Position): boolean {
      const piece = this.grid[position.row][position.col];
      let streak = 1;

      // Check horizontally.
      let col = position.col - 1;
      while (col >= 0 && this.grid[position.row][col] === piece) {
        streak++;
        col--;
      }
      col = position.col + 1;
      while (col < this.width && this.grid[position.row][col] === piece) {
        streak++;
        col++;
      }
      if (streak >= 3) {
        return true;
      }

      // Check vertically.
      streak = 1;
      let row = position.row - 1;
      while (row >= 0 && this.grid[row][position.col] === piece) {
        streak++;
        row--;
      }
      row = position.row + 1;
      while (row < this.height && this.grid[row][position.col] === piece) {
        streak++;
        row++;
      }
      return streak >= 3;
    }

    positions(): Position[] {
      let positions: Position[] = [];
      for (let row = 0; row < this.height; row++) {
        for (let col = 0; col < this.width; col++) {
          positions.push({ row, col });
        }
      }
      return positions;
    }

    piece(p: Position): T | undefined {
      return this.grid[p.row]?.[p.col];
    }

   canMove(first: Position, second: Position): boolean {
  // Check if the source and destination positions are the same.
  if (first.row === second.row && first.col === second.col) {
    return false;
  }

  // Check if the source and destination positions are within bounds.
  if (!this.isValidPosition(first) || !this.isValidPosition(second)) {
    return false;
  }

  // Check if the move is valid by ensuring that the source and destination positions
  // are either in the same row or in the same column.
  if (first.row !== second.row && first.col !== second.col) {
    return false;
  }

  // Swap the pieces temporarily.
  const temp = this.grid[first.row][first.col];
  this.grid[first.row][first.col] = this.grid[second.row][second.col];
  this.grid[second.row][second.col] = temp;

  // Check for matches at the source and destination positions and their adjacent positions.
  const isMatch =
    this.hasMatchAt(first) ||
    this.hasMatchAt(second) ||
    this.hasMatchAt({ row: first.row, col: first.col + 1 }) ||
    this.hasMatchAt({ row: first.row, col: first.col - 1 }) ||
    this.hasMatchAt({ row: second.row, col: second.col + 1 }) ||
    this.hasMatchAt({ row: second.row, col: second.col - 1 });

  // Undo the move.
  this.grid[second.row][second.col] = this.grid[first.row][first.col];
  this.grid[first.row][first.col] = temp;

  return isMatch;
};

    private findCascadingMatches(): Match<T>[] {
      const cascadingMatches: Match<T>[] = [];

      // Start from the bottom row and go up.
      for (let row = this.height - 1; row >= 0; row--) {
        for (let col = 0; col < this.width; col++) {
          const position: Position = { row, col };

          // Check if the current position is empty.
          if (!this.grid[row][col]) {
            continue; // Skip empty positions.
          }

          // Check if there is an empty position below the current one.
          if (row < this.height - 1 && !this.grid[row + 1][col]) {
            // Swap the pieces to simulate falling.
            const temp = this.grid[row][col];
            this.grid[row][col] = this.grid[row + 1][col];
            this.grid[row + 1][col] = temp;

            // Check for matches at the new position.
            if (this.hasMatchAt({ row: row + 1, col })) {
              const match: Match<T> = {
                matched: this.grid[row + 1][col],
                positions: [{ row: row + 1, col }],
              };
              cascadingMatches.push(match);
            }

            // Swap the pieces back to their original positions.
            this.grid[row + 1][col] = this.grid[row][col];
            this.grid[row][col] = temp;
          }
        }
      }

      return cascadingMatches;
    }

move(first: Position, second: Position): boolean {
  if (!this.canMove(first, second)) {
    return false;
  }

  // Swap the pieces.
  const temp = this.grid[first.row][first.col];
  this.grid[first.row][first.col] = this.grid[second.row][second.col];
  this.grid[second.row][second.col] = temp;

  // Check for matches.
  const horizontalMatches = this.findHorizontalMatches();
  const verticalMatches = this.findVerticalMatches();

  // Notify listeners of the matches.
  horizontalMatches.forEach((match) => {
    this.listeners.forEach((listener) => {
      listener({ kind: "Match", match });
    });
  });

  verticalMatches.forEach((match) => {
    this.listeners.forEach((listener) => {
      listener({ kind: "Match", match });
    });
  });

  // Check if a refill is needed.
  const cascadingMatches = this.findCascadingMatches();

  // Notify listeners of cascading matches.
  cascadingMatches.forEach((match) => {
    this.listeners.forEach((listener) => {
      listener({ kind: "Match", match });
    });
  });

  // Check if a refill is needed.
  if (cascadingMatches.length === 0) {
    this.fillTopRowWithNewTiles(); // Fill top row with new tiles here
    this.listeners.forEach((listener) => {
      listener({ kind: "Refill" });
    });
  }

  return true;
}

private fillTopRowWithNewTiles() {
  for (let col = 0; col < this.width; col++) {
    if (!this.grid[0][col]) {
      // Generate and place a new tile in the top row.
      this.grid[0][col] = this.generator.next();
    }
  }
}

private findHorizontalMatches(): Match<T>[] {
  const matches: Match<T>[] = [];

  for (let row = 0; row < this.height; row++) {
    for (let col = 0; col < this.width - 2; col++) {
      const piece = this.grid[row][col];

      if (
        piece === this.grid[row][col + 1] &&
        piece === this.grid[row][col + 2]
      ) {
        const match: Match<T> = {
          matched: piece,
          positions: [
            { row, col },
            { row, col: col + 1 },
            { row, col: col + 2 },
          ],
        };
        matches.push(match);
      }
    }
  }

  return matches;
}

  private findVerticalMatches(): Match<T>[] {
  const matches: Match<T>[] = [];

  for (let row = 0; row < this.height - 2; row++) {
    for (let col = 0; col < this.width; col++) {
      const piece = this.grid[row][col];

      if (
        piece === this.grid[row + 1][col] &&
        piece === this.grid[row + 2][col]
      ) {
        const match: Match<T> = {
          matched: piece,
          positions: [
            { row, col },
            { row: row + 1, col },
            { row: row + 2, col },
          ],
        };
        matches.push(match);
      }
    }
  }
  return matches;
    };
};
