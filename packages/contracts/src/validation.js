const clean = (value) => String(value ?? "").trim();

export function validateLogin(input) {
  const userId = clean(input?.userId);
  const password = String(input?.password ?? "");
  const errors = [];
  if (userId.length < 3 || userId.length > 120) errors.push({ field: "userId", message: "User ID must be 3-120 characters." });
  if (password.length < 8 || password.length > 200) errors.push({ field: "password", message: "Password must be 8-200 characters." });
  return { ok: errors.length === 0, errors, value: { userId, password } };
}

export function validateInquiry(input) {
  const value = {
    name: clean(input?.name),
    mobile: clean(input?.mobile).replace(/[\s()-]/g, ""),
    course: clean(input?.course),
    message: clean(input?.message),
    consent: input?.consent === true
  };
  const errors = [];
  if (value.name.length < 2 || value.name.length > 100) errors.push({ field: "name", message: "Name must be 2-100 characters." });
  if (!/^\+?[0-9]{10,15}$/.test(value.mobile)) errors.push({ field: "mobile", message: "Enter a valid 10-15 digit mobile number." });
  if (value.course.length < 2 || value.course.length > 100) errors.push({ field: "course", message: "Course must be 2-100 characters." });
  if (value.message.length > 500) errors.push({ field: "message", message: "Message must not exceed 500 characters." });
  if (!value.consent) errors.push({ field: "consent", message: "Consent is required." });
  return { ok: errors.length === 0, errors, value };
}
