"use client";

export default function PromotionDialog({ color = 'w', onSelect, onCancel }) {
  const pieces = color === 'w' ? ['Q', 'R', 'B', 'N'] : ['q', 'r', 'b', 'n'];
  const pieceSymbols = {
    w: { Q: '♕', R: '♖', B: '♗', N: '♘' },
    b: { q: '♛', r: '♜', b: '♝', n: '♞' },
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onCancel}
    >
      <div 
        className="bg-white rounded-2xl p-6 shadow-2xl border border-purple-200"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-xl font-bold text-center text-gray-800 mb-4">Promote Pawn</h3>
        <div className="flex justify-center items-center gap-3">
          {pieces.map((p) => (
            <button
              key={p}
              onClick={() => onSelect(p.toLowerCase())}
              className="w-20 h-20 rounded-lg bg-gray-100 hover:bg-purple-100 hover:scale-110 transition-transform duration-200 flex items-center justify-center text-6xl"
              aria-label={`Promote to ${p}`}
            >
              {pieceSymbols[color][p]}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
