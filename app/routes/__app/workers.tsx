import { Outlet } from "@remix-run/react";

export default function SalesRoute() {
    return (
        <div className="relative h-full p-10">
            <h1 className="font-display text-d-h3 text-black">
                Workers
            </h1>
            <div className="h-6"/>
            <Outlet/>
        </div>
    );
}
