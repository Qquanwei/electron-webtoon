import React, { useContext } from 'react';

const context = React.createContext();

export const Provider = context.Provider;

export default () => useContext(context);
