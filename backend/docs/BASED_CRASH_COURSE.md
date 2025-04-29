# Based Crash Course - Build Platform Agnostic Conversational Agents - Brainbase

Welcome to the **Based Crash Course**! This guide introduces you to **Based**, a powerful, domain-specific programming language designed to build platform agnostic conversational agents. Deploy conversational workflows on chat, voice, email, SMS, and more with ease, enabling seamless data exchange and a unified user experience across platforms.

## What Is Based?

Based is a high-level AI instruction language crafted to design dynamic conversational agents that operate flawlessly across multiple communication channels. It provides developers with an elegant, high-level syntax to build interactive workflows quickly and reliably.

Key features of Based include:

-   **Intuitive and Expressive Syntax:** Develop complex conversational logic with clarity and brevity.
-   **Specialized Constructs:** Utilize built-in keywords like `talk`, `loop`, `until`, and `ask` to manage conversation flow and state effortlessly.
-   **Cross-Platform Flexibility:** Create agents deployable on chat, voice, email, SMS, and more—all while sharing data seamlessly across channels.

## Core Conversation Flow Constructs

Based scripts use a trio of keywords to build interactive conversations:

1.  **`talk`**: Sends a message or prompt to the user and waits for a response (or specify **False** as the second argument to wait for the user to send a message first).
2.  **`loop`**: Begins a conversational block that allows for repeated prompting.
3.  **`until`**: Specifies the condition under which the loop should end.

In practice, the `talk` keyword is not used in isolation. It is usually enclosed in a `loop`/`until` structure. This pattern keeps the conversation repeating until valid input is obtained.

**Example Usage:**

```
loop:
    # Send a prompt to the user asking for their preferred contact method.
    response = talk(
        "Hi there! What's your preferred contact method (email, phone, or SMS)?",
        True,
        {"preferred_contact": "email"} // Example default value
    )
until "User provides a valid contact method":
    contactInfo = response.ask(
        question="Extract and validate the contact method from the response.",
        example={"preferred_contact": "email"}
    )
    # Validate the contact method; if invalid, the prompt repeats.
    if contactInfo["preferred_contact"] not in ["email", "phone", "SMS"]:
        print("Invalid contact method provided. Re-prompting...")
    else:
        print("Valid contact method received!")
```

## Core Language Constructs

### The `ask` Method

The `ask` method is used to extract structured data from a response. By providing an example object, you can ensure that the output is formatted predictably for further processing.

**Example:**

```
# Extract structured details (full name and email) from a user response.
userDetails = response.ask(
    question="Return the user's full name and email address.",
    example={"full_name": "John Doe", "email": "john.doe@example.com"}
)
```

## Full Example: An Interactive Workflow

Below is a complete example that combines `talk`, `loop`, `until`, and `ask` to build a seamless interactive conversation:

```
state = {}
meta_prompt = "You're an assistant that helps the user book shifts."
res = say("Hello, I'm a chatbot. Let's start by gathering your details.")

loop:
    # Initiate conversation to collect user details.
    phone_response = talk(
        f"{meta_prompt} Please provide your phone number, full name, and facility name. Confirm these details once provided.",
        True,
        {"phone_number": "+16179011508", "full_name": "John Doe", "facility_name": "Facility A"}
    )
until "User has provided phone number, full name, and facility name and confirmed them":
    # Extract the user details.
    info = phone_response.ask(
        question="Extract the user's phone number, full name, and facility name.",
        example={"phone_number": "+16179011508", "full_name": "John Doe", "facility_name": "Facility A"}
    )
    random_value = RANDOM(10).generate()
    answer_ = api.get_req(
        url='https://apigateway.example.com/api/facilities',
        headers={
            'authorization': 'Bearer 123',
            'cbh-facility-user-phone-number-auth': info["phone_number"],
            'cbh-external-caller-session': random_value
        }
    ).ask(
        question="Verify the provided details. If successful, return the user's name, facility name, and email; otherwise, return 'ERROR'.",
        example={"name": "John Doe", "facility_name": "Facility A", "email": "john.doe@example.com", "success": true}
    )
    print("Answer:", answer_)

    if not answer_["success"]:
        loop:
            phone_response = talk("Sorry, we couldn't verify your details. Please re-enter your information.", True)
        until "User confirms corrected details":
            info = phone_response.ask(
                question="Return the user's phone number, full name, and facility name.",
                example={"phone_number": "+16179011508", "full_name": "John Doe", "facility_name": "Facility A"}
            )
            state["info"] = info
    else:
        print("Verification successful:", answer_)
```

## Additional Notes

-   Based’s design abstracts away complexity while providing powerful control over conversational flows.
-   The constructs `loop`, `talk`, `until`, and `ask` empower you to design robust, interactive workflows.
-   While this guide focuses on core constructs, Based supports integration with external services (APIs, email systems, SMS gateways) using an intuitive syntax.

## Conclusion

Armed with these constructs, you can build dynamic, platform-agnostic conversational agents using Based. This guide has provided enhanced examples that showcase how to structure interactive conversations effectively. Happy coding!
