import type { LoaderFunction } from "@remix-run/server-runtime";
import { useLoaderData, NavLink } from "@remix-run/react";
import { json } from "@remix-run/server-runtime";
import { requireUser } from "~/session.server";
import { getAllUsers } from "~/models/user.server";
import {EditIcon, FilePlusIcon, LabelText} from "~/components";

type LoaderData = Awaited<ReturnType<typeof getAllUsers>>;

export const loader: LoaderFunction = async ({ request }) => {
  await requireUser(request);
  const users = await getAllUsers();
  return json<LoaderData>(users);
};

export default function Workers() {
  const users = useLoaderData<LoaderData>();
  return (
    <div className="flex overflow-hidden rounded-lg border border-gray-100">
      <div className="w-1/2 border-r border-gray-100">
        <NavLink
          to="new"
          prefetch="intent"
          className={({ isActive }) =>
            "block border-b-4 border-gray-100 py-3 px-4 hover:bg-gray-50" +
            " " +
            (isActive ? "bg-gray-50" : "")
          }
        >
          <span className="flex gap-1">
            <FilePlusIcon /> <span>Create new worker</span>
          </span>
        </NavLink>
        <div className="max-h-96 overflow-y-scroll">
          {users.map((user) => (
            <NavLink
              key={user.id}
              to={user.id}
              prefetch="intent"
              className={({ isActive }) =>
                "block border-b border-gray-50 py-3 px-4 hover:bg-gray-50" +
                " " +
                (isActive ? "bg-gray-50" : "")
              }
            >
              <div className="flex justify-between text-[length:14px] font-bold leading-6">
                <div>{user.email}</div>
                <div><EditIcon/></div>
              </div>
            </NavLink>
          ))}
        </div>
      </div>
    </div>
  );
}
