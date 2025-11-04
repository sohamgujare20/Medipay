import React, { useState } from "react";
import Sidebar from "./components/Sidebar";
import Navbar from "./components/Navbar";
import { Routes, Route } from "react-router-dom";

import Home from "./pages/Home";
import Billing from "./pages/Billing";
import Receipts from "./pages/Receipts";
import Inventory from "./pages/Inventory";
import Analytics from "./pages/Analytics";
import OCR from "./pages/OCR";
import Settings from "./pages/Settings";
import Logout from "./pages/Logout";

export default function App() {
    const [collapsed, setCollapsed] = useState(false);

    return ( <
        div className = "flex h-screen" >
        <
        Sidebar collapsed = { collapsed }
        setCollapsed = { setCollapsed }
        /> <
        div className = "flex-1 flex flex-col" >
        <
        Navbar collapsed = { collapsed }
        setCollapsed = { setCollapsed }
        /> <
        main className = "p-6 overflow-auto" >
        <
        Routes >
        <
        Route path = "/"
        element = { < Home / > }
        /> <
        Route path = "/billing"
        element = { < Billing / > }
        /> <
        Route path = "/receipts"
        element = { < Receipts / > }
        /> <
        Route path = "/inventory"
        element = { < Inventory / > }
        /> <
        Route path = "/analytics"
        element = { < Analytics / > }
        /> <
        Route path = "/ocr"
        element = { < OCR / > }
        /> <
        Route path = "/settings"
        element = { < Settings / > }
        /> <
        Route path = "/logout"
        element = { < Logout / > }
        /> <
        /Routes> <
        /main> <
        /div> <
        /div>
    );
}