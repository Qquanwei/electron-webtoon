import React, { useContext } from 'react';

const context = React.createContext();

export const { Provider } = context;

export default () => useContext(context);
