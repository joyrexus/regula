Here's a summary and walkthrough of the example code demonstrating how to evaluate premium membership eligibility using Regula.

---

## Premium Membership Eligibility Check

This example showcases how to use Regula to define and evaluate a ruleset that determines whether a user qualifies for a premium membership.

The ruleset consists of a **parent rule** (`Eligibility Check`) that contains two **subrules**:

1. **Check Subscription** – The user must have an active subscription.
2. **Check Age** – The user must be older than 18.

If both conditions are met, the overall result is **"User is eligible for premium membership"**. Otherwise, the evaluation defaults to **"User is not eligible"**.

The example progresses through three evaluations, illustrating how Regula accumulates evaluation results over time.

---

## Walkthrough

### **Evaluation 1: Partial Data - Age Provided, Subscription Missing**

- The first evaluation provides only the user's **age (20 years old)** from the `UserDB` data source.
- Since the **subscription status is unknown**, the evaluation defaults to **"User is not eligible"**.
- The `"Check Age"` rule is satisfied, but `"Check Subscription"` is **not yet evaluated**.
- **Stored Results:**
  - `"Check Age"`: ✅ (`true`, age > 18)
  - `"Check Subscription"`: ❌ (missing)

**Result:** `"User is not eligible"`

---

### **Evaluation 2: Subscription Provided**

- The second evaluation provides the **subscription status (active: true)** from the `SubscriptionService` data source.
- The `"Check Age"` condition is **already satisfied** from the first evaluation.
- The `"Check Subscription"` condition **now passes**, meaning both conditions in `"Eligibility Check"` are met.
- The user is **eligible for premium membership**.

**Result:** `"User is eligible for premium membership"`

---

### **Evaluation 3: Subscription Updated (Inactive)**

- The third evaluation **updates the subscription status to inactive (false)**.
- The `"Check Age"` condition **remains satisfied**.
- The `"Check Subscription"` condition **now fails**.
- Since the **AND condition** in `"Eligibility Check"` is no longer met, the evaluation **reverts to the default result**.

**Result:** `"User is not eligible"`

---

## Key Takeaways

- **Regula maintains evaluation state:** Previously evaluated conditions (like age) are reused.
- **Successive evaluations update results dynamically:** The user's eligibility status can change as new data is received.
- **Stored results allow for incremental decision-making:** Different data sources can contribute information at different times.

This example demonstrates how Regula can be used to track conditions over time, ensuring that membership eligibility is always determined based on the most recent data.
