import React from "react";

export interface FeatureCardProps {
  emoji: string;
  title: string;
  description: string;
  featureKey: string;
  onSelect: (key: string) => void;
}

const FeatureCard: React.FC<FeatureCardProps> = ({
  emoji,
  title,
  description,
  featureKey,
  onSelect,
}) => (
  <div
    className="group cursor-pointer"
    onClick={() => onSelect(featureKey)}
  >
    <div className="bg-white rounded-2xl p-8 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105">
      <div className="text-5xl mb-6 text-center">{emoji}</div>
      <h3 className="text-xl font-bold mb-4 text-center text-gray-900">
        {title}
      </h3>
      <p className="text-gray-600 text-center leading-relaxed">{description}</p>
    </div>
  </div>
);

export default FeatureCard;
