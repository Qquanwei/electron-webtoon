import { UnaryFunction } from "@shared/type";
import React, { useContext, useState } from "react";

const Context = React.createContext<Record<string, any>>({});
const SetterContext = React.createContext<React.SetStateAction<
  Record<string, any>
> | null>(null);

export function useForm() {
  return useContext(Context);
}

export function useFormUpdate() {
  return useContext(SetterContext) as UnaryFunction<
    UnaryFunction<Record<string, string>, Record<string, string>>
  >;
}

const Form: React.FC = ({ children }) => {
  const [formData, setFormData] = useState({});

  return (
    <Context.Provider value={formData}>
      <SetterContext.Provider value={setFormData}>
        <form action="">{children}</form>
      </SetterContext.Provider>
    </Context.Provider>
  );
};

export default Form;
