import React from "react";

interface LabelProps {
  children: React.ReactNode;
  htmlFor?: string;
  required?: boolean;
  size?: "small" | "medium" | "large";
  disabled?: boolean;
  variant?: "default" | "checkbox" | "inline" | "group";
  helpText?: string;
  error?: boolean;
  success?: boolean;
  warning?: boolean;
}

// 유틸리티 함수들 (테스트 가능)

export const getLabelClasses = (
  size: string,
  variant: string,
  error: boolean,
  success: boolean,
  warning: boolean,
  disabled: boolean
): string => {
  return [
    "label",
    size,
    variant,
    error && "error",
    success && "success",
    warning && "warning",
    disabled && "disabled",
  ]
    .filter(Boolean)
    .join(" ");
};


export const getWrapperClasses = (variant: string): string => {
  return [variant === "group" && "labelGroup"].filter(Boolean).join(" ");
};


export const shouldShowRequired = (required: boolean): boolean => {
  return Boolean(required);
};


export const shouldShowHelpText = (helpText: string | undefined): boolean => {
  return Boolean(helpText);
};


export const validateLabelSize = (size: string): boolean => {
  const validSizes = ["small", "medium", "large"];
  return validSizes.includes(size);
};


export const validateLabelVariant = (variant: string): boolean => {
  const validVariants = ["default", "checkbox", "inline", "group"];
  return validVariants.includes(variant);
};

export default function Label({
  children,
  htmlFor,
  required = false,
  size = "medium",
  disabled = false,
  variant = "default",
  helpText,
  error = false,
  success = false,
  warning = false,
}: LabelProps) {
  const labelClasses = getLabelClasses(
    size,
    variant,
    error,
    success,
    warning,
    disabled
  );
  const wrapperClasses = getWrapperClasses(variant);

  return (
    <div className={wrapperClasses}>
      <label htmlFor={htmlFor} className={labelClasses} data-testid="label">
        {children}
        {shouldShowRequired(required) && <span className="required">*</span>}
      </label>
      {shouldShowHelpText(helpText) && (
        <div className="helpText">{helpText}</div>
      )}
    </div>
  );
}
