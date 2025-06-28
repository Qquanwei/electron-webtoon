import React, { useCallback } from "react";
import { useForm, useFormUpdate } from "./form";

interface FormItemProps {
  /**
   * 控件展示名
   */
  label: string;
  /**
   * 控件属性名
   */
  name: string;
  className?: string;
}

const FormItem: React.FC<FormItemProps> = ({
  name,
  className,
  label,
  children,
}) => {
  const formData = useForm();
  const update = useFormUpdate();
  const onChange = useCallback((value: string) => {
    update((state) => ({
      ...state,
      [name]: value,
    }));
  }, []);
  return (
    <div className={`1inline-flex ${className || ""}`}>
      <div>{label}</div>

      {React.isValidElement(children) &&
        React.cloneElement(children, {
          value: formData[name],
          onChange,
        } as any)}
      {children}
    </div>
  );
};

export default FormItem;
