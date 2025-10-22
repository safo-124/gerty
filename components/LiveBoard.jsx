"use client";

import { useMemo, useState } from 'react';
import { Chessboard } from 'react-chessboard';

export default function LiveBoard({ fen, onMove, onSelect, legalTargets = [], arePiecesDraggable = true, boardOrientation = 'white', side, lastMove }) {
  const [selected, setSelected] = useState(null);
  const legalSet = useMemo(() => new Set(legalTargets), [legalTargets]);

  const customSquareStyles = useMemo(() => {
    const styles = {};
    if (lastMove?.from) {
      styles[lastMove.from] = { background: 'rgba(253,230,138,0.6)' }; // amber-200
    }
    if (lastMove?.to) {
      styles[lastMove.to] = { ...(styles[lastMove.to] || {}), background: 'rgba(253,230,138,0.6)' };
    }
    for (const t of legalSet) {
      styles[t] = { ...(styles[t] || {}), background: 'radial-gradient(circle, rgba(0,0,0,0.25) 22%, rgba(0,0,0,0) 23%)' };
    }
    if (selected) {
      styles[selected] = { ...(styles[selected] || {}), outline: '2px solid #facc15' };
    }
    return styles;
  }, [legalSet, lastMove?.from, lastMove?.to, selected]);

  function handleSquareClick(square) {
    if (!arePiecesDraggable) return;
    if (!selected) {
      setSelected(square);
      onSelect?.(square);
    } else {
      const from = selected;
      const to = square;
      setSelected(null);
      if (from !== to) Promise.resolve(onMove?.(from, to)).catch(() => {});
    }
  }

  return (
    <div className="w-full max-w-[600px]">
      <Chessboard
        id="live-board"
        position={fen}
        boardOrientation={boardOrientation}
        arePiecesDraggable={arePiecesDraggable}
        onPieceDrop={(sourceSquare, targetSquare) => onMove?.(sourceSquare, targetSquare)}
        onSquareClick={handleSquareClick}
        customSquareStyles={customSquareStyles}
        customBoardStyle={{ borderRadius: '16px' }}
        animationDuration={200}
      />
    </div>
  );
}
