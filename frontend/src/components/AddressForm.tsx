import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { createAddress } from "../api/addresses";
import { getErrorMessage } from "../api/client";
import { Button } from "./ui/button";
import { Field, FieldGroup, FieldLabel } from "./ui/field";
import { Input } from "./ui/input";
import type { Address } from "../types";

const addressSchema = z.object({
    recipient: z.string().trim().min(1, "請填寫收件人"),
    phone: z.string().trim().min(6, "請輸入有效電話"),
    region: z.string().trim().min(1, "請填寫縣市與行政區"),
    detail: z.string().trim().min(1, "請填寫詳細地址"),
});
type AddressValues = z.infer<typeof addressSchema>;

type Props = {
    saveAddress?: (values: AddressValues) => Promise<Address>;
    onCreated: (address: Address) => void;
    onCancel: () => void;
};

export function AddressForm({ onCreated, onCancel, saveAddress }: Props) {
    const form = useForm<AddressValues>({
        resolver: zodResolver(addressSchema),
    });
    const fields: {
        name: keyof AddressValues;
        label: string;
        placeholder: string;
    }[] = [
        { name: "recipient", label: "收件人", placeholder: "姓名" },
        { name: "phone", label: "聯絡電話", placeholder: "手機或市話" },
        {
            name: "region",
            label: "縣市／行政區",
            placeholder: "例如：台北市中山區",
        },
        { name: "detail", label: "詳細地址", placeholder: "街道、門牌與樓層" },
    ];
    return (
        <form
            className="form-stack"
            onSubmit={form.handleSubmit(async (values) => {
                try {
                    onCreated(
                        await (saveAddress
                            ? saveAddress(values)
                            : createAddress({ ...values, is_default: true })),
                    );
                } catch (error) {
                    form.setError("root", { message: getErrorMessage(error) });
                }
            })}
        >
            <FieldGroup>
                {fields.map(({ name, label, placeholder }) => (
                    <Field
                        className="field"
                        data-invalid={Boolean(form.formState.errors[name])}
                        key={name}
                    >
                        <FieldLabel htmlFor={name}>{label}</FieldLabel>
                        <Input
                            id={name}
                            {...form.register(name)}
                            placeholder={placeholder}
                            aria-invalid={Boolean(form.formState.errors[name])}
                        />
                        {form.formState.errors[name] ? (
                            <small>
                                {form.formState.errors[name]?.message}
                            </small>
                        ) : null}
                    </Field>
                ))}
            </FieldGroup>
            {form.formState.errors.root ? (
                <p className="text-destructive" role="alert">
                    {form.formState.errors.root.message}
                </p>
            ) : null}
            <div className="flex justify-end gap-3">
                <Button variant="outline" type="button" onClick={onCancel}>
                    返回
                </Button>
                <Button type="submit" disabled={form.formState.isSubmitting}>
                    {form.formState.isSubmitting ? "保存中…" : "保存地址"}
                </Button>
            </div>
        </form>
    );
}
