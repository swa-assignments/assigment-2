export type Generator<T>= { next:() => T }

export type Position = {
    row: number,
    col: number
}

export type Match<T> = {
    matched: T,
    positions: Position[]
}

export type BoardEvent<T> = {
  kind: string;  // e.g., 'move', 'swap', 'match', 'refill', etc.
  match?: Match<T>;  // Optional match information.
};

export type BoardListener<T> = (event: BoardEvent<T>) => void;

export class Board<T> {
  readonly width: number;
  readonly height: number;
  private grid: T[][];
  private listeners: BoardListener<T>[] = [];
  private generator: Generator<T>;

  constructor(generator: Generator<T>, width: number, height: number) {
      this.generator = generator;
      this.width = width;
      this.height = height;
      this.grid = Array.from({ length: height }, () =>
          Array.from({ length: width }, () => this.generator.next())
      );
  }

  addListener(listener: BoardListener<T>) {
      this.listeners.push(listener);
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
    if (first.row === second.row && Math.abs(first.col - second.col) === 1) {
        return this.swapAndCheckMatch(first, second);
    }

    if (first.col === second.col && Math.abs(first.row - second.row) === 1) {
        return this.swapAndCheckMatch(first, second);
    }

    if (first.col === second.col && Math.abs(first.row - second.row) === 2) {
        return this.swapAndCheckMatch(first, second);
    }

    return false;
}

private swapAndCheckMatch(first: Position, second: Position): boolean {
  // Temporarily swap pieces
  const temp = this.grid[first.row][first.col];
  this.grid[first.row][first.col] = this.grid[second.row][second.col];
  this.grid[second.row][second.col] = temp;

  const isMatch = this.hasMatchAt(first) || this.hasMatchAt(second);

  // Undo the swap
  this.grid[second.row][second.col] = this.grid[first.row][first.col];
  this.grid[first.row][first.col] = temp;

  return isMatch;
}

  
  private hasMatchAt(position: Position): boolean {
      const piece = this.grid[position.row][position.col];
      let streak = 1;

      // Check horizontally
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

      // Check vertically
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

  private deleteMatches(matches: Match<T>[]): void {
    for (const match of matches) {
        for (const position of match.positions) {
            this.grid[position.row][position.col] = undefined;
        }
    }
}

  move(first: Position, second: Position) {
    if (!this.canMove(first, second)) {
        return;
    }
    
    // Swap pieces
    const temp = this.grid[first.row][first.col];
    this.grid[first.row][first.col] = this.grid[second.row][second.col];
    this.grid[second.row][second.col] = temp;

    let matches;
    do {
        matches = this.findMatches();
        if (matches.length) {
            this.deleteMatches(matches);  // Call the deleteMatches method here
            this.generateNewTiles();
        }
    } while (matches.length);
    
    // TODO: Notify listeners of relevant events.
}


private findMatches(): Match<T>[] {
  const matches: Match<T>[] = [];

  // Horizontal matches
  for (let row = 0; row < this.height; row++) {
      let col = 0;
      while (col < this.width - 2) {
          if (this.grid[row][col] && this.grid[row][col] === this.grid[row][col + 1] && this.grid[row][col] === this.grid[row][col + 2]) {
              const startPosition = col;
              while (col < this.width && this.grid[row][col] === this.grid[row][startPosition]) {
                  col++;
              }
              const endPosition = col - 1;
              const matchPositions: Position[] = [];
              for (let m = startPosition; m <= endPosition; m++) {
                  matchPositions.push({ row, col: m });
              }
              matches.push({ matched: this.grid[row][startPosition], positions: matchPositions });
          } else {
              col++;
          }
      }
  }

  // Vertical matches
  // Vertical matches
for (let col = 0; col < this.width; col++) {
  let row = 0;
  while (row < this.height - 2) {
      if (this.grid[row][col] && this.grid[row][col] === this.grid[row + 1][col] && this.grid[row][col] === this.grid[row + 2][col]) {
          const startPosition = row;
          row += 2;  // skip the tiles we already know are matching
          while (row + 1 < this.height && this.grid[row + 1][col] === this.grid[startPosition][col]) {
              row++;
          }
          const endPosition = row;
          const matchPositions: Position[] = [];
          for (let m = startPosition; m <= endPosition; m++) {
              matchPositions.push({ row: m, col });
          }
          matches.push({ matched: this.grid[startPosition][col], positions: matchPositions });
      } else {
          row++;
      }
  }
}


  return matches;
}

private generateNewTiles() {
  for (let col = 0; col < this.width; col++) {
      for (let row = this.height - 1; row >= 0; row--) {
          if (!this.grid[row][col]) {
              let aboveRow = row - 1;
              // Find the first tile above the current position.
              while (aboveRow >= 0 && !this.grid[aboveRow][col]) {
                  aboveRow--;
              }
              
              // If a tile is found, bring it down to the current position.
              if (aboveRow >= 0) {
                  this.grid[row][col] = this.grid[aboveRow][col];
                  this.grid[aboveRow][col] = undefined;
              } else {
                  // If no tile is found above, generate a new tile.
                  this.grid[row][col] = this.generator.next();
              }
          }
      }
  }
}
}