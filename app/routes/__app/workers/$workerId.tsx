import type { LoaderFunction, ActionFunction } from "@remix-run/node";
import { json } from "@remix-run/node";
import {
  Link,
  useCatch,
  useFetcher,
  useLoaderData,
  useLocation,
  useParams,
} from "@remix-run/react";
import type { Password, User } from "@prisma/client";
import { inputClasses, LabelText, submitButtonClasses } from "~/components";
import { requireUser } from "~/session.server";
import { currencyFormatter, parseDate } from "~/utils";
import {createDeposit, Deposit} from "~/models/deposit.server";
import invariant from "tiny-invariant";
import { useEffect, useRef } from "react";
import {getUserById} from "~/models/user.server";
import {DueStatus, LineItem} from "~/models/invoice.server";

type LoaderData = {
  customerName: string;
  customerId: string;
  totalAmount: number;
  dueStatus: DueStatus;
  dueDisplay: string;
  invoiceDateDisplay: string;
  lineItems: Array<
      Pick<LineItem, "id" | "quantity" | "unitPrice" | "description">
      >;
  deposits: Array<
      Pick<Deposit, "id" | "amount"> & { depositDateFormatted: string }
      >;
};

export const loader: LoaderFunction = async ({ request, params }) => {
  await requireUser(request);
  const { workerId } = params;
  if (typeof workerId !== "string") {
    throw new Error("This should be impossible.");
  }
  const worker = await getUserById(workerId);
  if (!worker) {
    throw new Response("not found", { status: 404 });
  }
  return json<User>(worker);
};

type ActionData = {
  errors: {
    amount: string | null;
    depositDate: string | null;
  };
};

function validateAmount(amount: number) {
  if (amount <= 0) return "Must be greater than 0";
  if (Number(amount.toFixed(2)) !== amount) {
    return "Must only have two decimal places";
  }
  return null;
}

function validateDepositDate(date: Date) {
  if (Number.isNaN(date.getTime())) {
    return "Please enter a valid date";
  }
  return null;
}

export const action: ActionFunction = async ({ request, params }) => {
  await requireUser(request);
  const { invoiceId } = params;
  if (typeof invoiceId !== "string") {
    throw new Error("This should be unpossible.");
  }
  const formData = await request.formData();
  const intent = formData.get("intent");
  invariant(typeof intent === "string", "intent required");
  switch (intent) {
    case "create-deposit": {
      const amount = Number(formData.get("amount"));
      const depositDateString = formData.get("depositDate");
      const note = formData.get("note");
      invariant(!Number.isNaN(amount), "amount must be a number");
      invariant(typeof depositDateString === "string", "dueDate is required");
      invariant(typeof note === "string", "dueDate is required");
      const depositDate = parseDate(depositDateString);

      const errors: ActionData["errors"] = {
        amount: validateAmount(amount),
        depositDate: validateDepositDate(depositDate),
      };
      const hasErrors = Object.values(errors).some(
        (errorMessage) => errorMessage
      );
      if (hasErrors) {
        return json<ActionData>({ errors });
      }

      await createDeposit({ invoiceId, amount, note, depositDate });
      return new Response("ok");
    }
    default: {
      throw new Error(`Unsupported intent: ${intent}`);
    }
  }
};

const lineItemClassName =
  "flex justify-between border-t border-gray-100 py-4 text-[14px] leading-[24px]";

export default function WorkerRoute() {
  const data = useLoaderData() as LoaderData;
  const location = useLocation();
  return (
    <div className="relative p-10" key={location.key}>
      <div className="h-4" />
      <div>
        Name: {data.name}
      </div>
      <div>
        Email: {data.email}
      </div>
      <div>
        Phone: {data.phone}
      </div>
      <div>
        Start: {data.createdAt}
      </div>
      <div>
        Last Seen: {data.updatedAt}
      </div>
    </div>
  );
}

interface DepositFormControlsCollection extends HTMLFormControlsCollection {
  amount?: HTMLInputElement;
  depositDate?: HTMLInputElement;
  note?: HTMLInputElement;
  intent?: HTMLButtonElement;
}
interface DepositFormElement extends HTMLFormElement {
  readonly elements: DepositFormControlsCollection;
}

function Deposits() {
  const data = useLoaderData() as LoaderData;
  const newDepositFetcher = useFetcher();
  const formRef = useRef<HTMLFormElement>(null);

  const deposits = [...data.deposits];

  if (newDepositFetcher.submission) {
    const amount = Number(newDepositFetcher.submission.formData.get("amount"));
    const depositDateVal =
      newDepositFetcher.submission.formData.get("depositDate");
    const depositDate =
      typeof depositDateVal === "string" ? parseDate(depositDateVal) : null;
    if (
      !validateAmount(amount) &&
      depositDate &&
      !validateDepositDate(depositDate)
    ) {
      deposits.push({
        id: "new",
        amount,
        depositDateFormatted: depositDate.toLocaleDateString(),
      });
    }
  }

  const errors = newDepositFetcher.data?.errors as
    | ActionData["errors"]
    | undefined;

  useEffect(() => {
    if (!formRef.current) return;
    if (newDepositFetcher.type !== "done") return;
    const formEl = formRef.current as DepositFormElement;
    if (errors?.amount) {
      formEl.elements.amount?.focus();
    } else if (errors?.depositDate) {
      formEl.elements.depositDate?.focus();
    } else if (document.activeElement === formEl.elements.intent) {
      formEl.reset();
      formEl.elements.amount?.focus();
    }
  }, [newDepositFetcher.type, errors]);

  return (
    <div>
      <div className="font-bold leading-8">Deposits</div>
      {deposits.length > 0 ? (
        deposits.map((deposit) => (
          <div key={deposit.id} className={lineItemClassName}>
            <Link
              to={`../../deposits/${deposit.id}`}
              className="text-blue-600 underline"
            >
              {deposit.depositDateFormatted}
            </Link>
            <div>{currencyFormatter.format(deposit.amount)}</div>
          </div>
        ))
      ) : (
        <div>None yet</div>
      )}
      <newDepositFetcher.Form
        method="post"
        className="grid grid-cols-1 gap-x-4 gap-y-2 lg:grid-cols-2"
        ref={formRef}
        noValidate
      >
        <div className="min-w-[100px]">
          <div className="flex flex-wrap items-center gap-1">
            <LabelText>
              <label htmlFor="depositAmount">Amount</label>
            </LabelText>
            {errors?.amount ? (
              <em id="amount-error" className="text-d-p-xs text-red-600">
                {errors.amount}
              </em>
            ) : null}
          </div>
          <input
            id="depositAmount"
            name="amount"
            type="number"
            className={inputClasses}
            min="0.01"
            step="any"
            required
            aria-invalid={Boolean(errors?.amount) || undefined}
            aria-errormessage={errors?.amount ? "amount-error" : undefined}
          />
        </div>
        <div>
          <div className="flex flex-wrap items-center gap-1">
            <LabelText>
              <label htmlFor="depositDate">Date</label>
            </LabelText>
            {errors?.depositDate ? (
              <em id="depositDate-error" className="text-d-p-xs text-red-600">
                {errors.depositDate}
              </em>
            ) : null}
          </div>
          <input
            id="depositDate"
            name="depositDate"
            type="date"
            className={`${inputClasses} h-[34px]`}
            required
            aria-invalid={Boolean(errors?.depositDate) || undefined}
            aria-errormessage={
              errors?.depositDate ? "depositDate-error" : undefined
            }
          />
        </div>
        <div className="grid grid-cols-1 gap-4 lg:col-span-2 lg:flex">
          <div className="flex-1">
            <LabelText>
              <label htmlFor="depositNote">Note</label>
            </LabelText>
            <input
              id="depositNote"
              name="note"
              type="text"
              className={inputClasses}
            />
          </div>
          <div className="flex items-end">
            <button
              type="submit"
              className={submitButtonClasses}
              name="intent"
              value="create-deposit"
            >
              Create
            </button>
          </div>
        </div>
      </newDepositFetcher.Form>
    </div>
  );
}

function LineItemDisplay({
  description,
  quantity,
  unitPrice,
}: {
  description: string;
  quantity: number;
  unitPrice: number;
}) {
  return (
    <div className={lineItemClassName}>
      <div>{description}</div>
      <div className="text-[10px]">({quantity}x)</div>
      <div>{currencyFormatter.format(unitPrice)}</div>
    </div>
  );
}

export function CatchBoundary() {
  const caught = useCatch();
  const params = useParams();

  if (caught.status === 404) {
    return (
      <div className="p-12 text-red-500">
        No invoice found with the ID of "{params.invoiceId}"
      </div>
    );
  }

  throw new Error(`Unexpected caught response with status: ${caught.status}`);
}

export function ErrorBoundary({ error }: { error: Error }) {
  console.error(error);

  return (
    <div className="absolute inset-0 flex justify-center bg-red-100 pt-4">
      <div className="text-center text-red-brand">
        <div className="text-[14px] font-bold">Oh snap!</div>
        <div className="px-2 text-[12px]">There was a problem. Sorry.</div>
      </div>
    </div>
  );
}
