import { render, screen } from "@testing-library/react";
import App from "./App";

test("renders dashboard shell", () => {
  render(<App />);
  expect(screen.getByText(/Data Product Publishing/i)).toBeInTheDocument();
  expect(screen.getByText(/Dashboard/i)).toBeInTheDocument();
});
