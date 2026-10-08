import Navbar from "./Navbar";

const Layout = ({ children }) => {
  return (
    <div id="app">
      <Navbar>{children}</Navbar>
    </div>
  );
};

export default Layout;
