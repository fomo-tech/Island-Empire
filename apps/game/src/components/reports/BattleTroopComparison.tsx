type BattleTroopComparisonProps = {
  attackerInitial: number;
  attackerSurvivors: number;
  defenderInitial: number;
  defenderSurvivors: number;
};

function percent(survivors: number, initial: number) {
  return initial > 0 ? Math.max(0, Math.min(100, (survivors / initial) * 100)) : 0;
}

function number(value: number) {
  return Math.max(0, value || 0).toLocaleString("vi-VN");
}

export function BattleTroopComparison({
  attackerInitial,
  attackerSurvivors,
  defenderInitial,
  defenderSurvivors,
}: BattleTroopComparisonProps) {
  const attackerPercent = percent(attackerSurvivors, attackerInitial);
  const defenderPercent = percent(defenderSurvivors, defenderInitial);
  return (
    <section className="battle-comparison" aria-label="So sánh quân lực sau trận đánh">
      <div className="battle-comparison__side attacker">
        <span><strong>{number(attackerSurvivors)}</strong><small>/ {number(attackerInitial)} quân còn lại</small></span>
        <i><b style={{ width: `${attackerPercent}%` }} /></i>
        <em>Tổn thất {number(attackerInitial - attackerSurvivors)}</em>
      </div>
      <div className="battle-comparison__center">QUÂN LỰC SAU TRẬN</div>
      <div className="battle-comparison__side defender">
        <span><strong>{number(defenderSurvivors)}</strong><small>/ {number(defenderInitial)} quân còn lại</small></span>
        <i><b style={{ width: `${defenderPercent}%` }} /></i>
        <em>Tổn thất {number(defenderInitial - defenderSurvivors)}</em>
      </div>
    </section>
  );
}

