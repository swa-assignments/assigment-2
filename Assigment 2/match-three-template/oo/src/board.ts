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
      // Check if the source and destination positions are within bounds.
      if (!this.isValidPosition(first) || !this.isValidPosition(second)) {
        return false;
      }
  
      // Assuming a simple rule where only adjacent pieces can be moved.
      const rowDiff = Math.abs(first.row - second.row);
      const colDiff = Math.abs(first.col - second.col);
  
      if ((rowDiff === 1 && colDiff === 0) || (rowDiff === 0 && colDiff === 1)) {
        // Check if the move creates a match (either vertically or horizontally).
        const temp = this.grid[first.row][first.col];
        this.grid[first.row][first.col] = this.grid[second.row][second.col];
        this.grid[second.row][second.col] = temp;
  
        const isMatch = this.hasMatchAt(first) || this.hasMatchAt(second);
  
        // Undo the move.
        this.grid[second.row][second.col] = this.grid[first.row][first.col];
        this.grid[first.row][first.col] = temp;
  
        return isMatch;
      }
  
      return false;
    }
  
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
  
      // Check for matches at both positions.
      const matches: Match<T>[] = [];
  
      if (this.hasMatchAt(first)) {
        const match: Match<T> = {
          matched: this.grid[first.row][first.col],
          positions: [{ ...first }],
        };
        matches.push(match);
      }
  
      if (this.hasMatchAt(second)) {
        const match: Match<T> = {
          matched: this.grid[second.row][second.col],
          positions: [{ ...second }],
        };
        matches.push(match);
      }
  
      // Notify listeners of the matches.
      matches.forEach((match) => {
        this.listeners.forEach((listener) => {
          listener({ kind: "match", match });
        });
      });
  
      // Check for cascading matches.
      const cascadingMatches = this.findCascadingMatches();
  
      // Notify listeners of cascading matches.
      cascadingMatches.forEach((match) => {
        this.listeners.forEach((listener) => {
          listener({ kind: "match", match });
        });
      });
  
      // Check if a refill is needed.
      if (cascadingMatches.length === 0) {
        this.listeners.forEach((listener) => {
          listener({ kind: "refill" });
        });
      }
  
      return true;
    }
  }
  