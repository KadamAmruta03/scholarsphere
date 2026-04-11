import React from "react";
import "./PageBackground.css";
import booksImage from "./Images/books.jpg"; // import the image


export default function PageBackground({ children }) {
    return (
      <div
        className="page-bg"
        style={{ backgroundImage: `url(${booksImage})` }} // use imported image
      >
        <div className="page-foreground">{children}</div>
      </div>
    );
  }
  
