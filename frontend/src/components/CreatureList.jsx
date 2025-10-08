import React from 'react';
import CreatureItem from './CreatureItem';

const CreatureList = ({ creatures, activeId, onUpdate, onRemove, dmControls, onPatch }) => {
  return (
    <div>
      {creatures.map((c) => {
        const isActive = String(activeId ?? "") === String(c.id ?? "");
        return (
          <div
            key={c.id}
            id={`creature-${c.id}`}
            style={{
              padding: 12,
              marginBottom: 10,
              borderRadius: 10,
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.08)",
              boxShadow: "0 4px 12px rgba(0,0,0,0.25)",
              borderLeft: `4px solid ${c.alignment === "Good" ? "#31c48d" : c.alignment === "Neutral" ? "#f59e0b" : "#ef4444"}`,
              position: "relative",
              transition: "box-shadow 0.2s ease, outline 0.2s ease",
              ...(isActive
                ? {
                    outline: "3px solid #ffd54f", 
                    boxShadow: "0 0 0 1px rgba(0,0,0,0.35), 0 12px 24px rgba(0,0,0,0.55)",
                  }
                : {}),
            }}
          >
            {isActive && (
              <div
                title="Current turn"
                aria-label="Current turn"
                style={{ position: "absolute", top: 8, right: 10, fontSize: 20 }}
              >
                ⭐
              </div>
            )}

            <CreatureItem
              creature={c}
              onUpdate={onUpdate}
              onRemove={onRemove}
              dmControls={dmControls}
              onPatch={onPatch}
            />

            <button
              onClick={() => {
                const next = c.alignment === "Good" ? "Evil" : "Good";
                onPatch ? onPatch(c.id, { alignment: next }) : onUpdate({ id: c.id, alignment: next });
              }}
              style={{
                padding: "4px 10px",
                borderRadius: 999,
                border: "1px solid rgba(255,255,255,0.18)",
                background:
                  c.alignment === "Good"
                    ? "linear-gradient(180deg, rgba(50,180,120,.9), rgba(30,130,90,.9))"
                    : "linear-gradient(180deg, rgba(210,70,70,.9), rgba(160,40,40,.9))",
                color: "#fff",
                cursor: "pointer",
                fontSize: 12,
                marginTop: 8,
              }}
            >
              {c.alignment === "Good" ? "Good" : "Evil"}
            </button>
          </div>
        );
      })}
    </div>
  );
};

export default CreatureList;
