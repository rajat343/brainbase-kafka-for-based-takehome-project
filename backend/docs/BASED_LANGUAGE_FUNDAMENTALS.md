# Based Language Fundamentals - Core Constructs Reference - Brainbase

Welcome to the **Based Language Fundamentals** guide. This reference document provides a comprehensive explanation of Based’s core language constructs, their declaration syntax, arguments, and practical usage examples. Understanding these fundamentals will enable you to build sophisticated conversational agents with precision and confidence.

## Core Language Constructs

Based is built around a set of specialized constructs designed specifically for conversational AI workflows. These constructs provide a high-level abstraction that makes it easy to build complex interactions without getting lost in implementation details.

### The `say` Function

The `say` function generates a response from the AI to the user without expecting a reply. It’s typically used to provide information, instructions, or acknowledgments.

**Syntax:**

```
say(message, exact=False, model=None)
```

**Parameters:**

-   `message` (string): The content to be processed and presented to the user
-   `exact` (boolean, optional): Controls how the message is processed
    -   `True`: Outputs exactly what’s provided in the message parameter, verbatim
    -   `False` (default): Allows the AI to rephrase the message while maintaining its meaning
-   `model` (string, optional): Specifies which AI model to use for processing the message (when exact=False)

**Return Value:**

-   Returns the response text, which can be stored in a variable for later use or simply executed for its side effect

**Example:**

```
# Greet the user with an exact message
say("Welcome to BookBot! I'm here to help you find and reserve books.", exact=True)

# Generate a dynamic welcome based on intent
say("Generate a friendly welcome for a user looking for book recommendations")

# Store the response for later use
intro = say("Introduce yourself as a helpful assistant", model="anthropic/claude-3.7-sonnet")
```

### The `loop`, `talk`, and `until` Pattern

In Based, the `loop`, `talk`, and `until` constructs form an essential pattern that must be used together. This pattern creates interactive conversation flows that can repeat until specific conditions are met. The `talk` function is not meant to be used in isolation.

**Syntax:**

```
loop:
    response = talk(
        system_prompt,
        first_prompt=True,
        default_values={},
        info={}
    )
until "Description of the completion condition":
    # Validation code that determines if the condition is met
    # The loop continues until this code completes successfully
```

**Parameters for `talk`:**

-   `system_prompt` (string): Instruction or prompt that guides the conversation
-   `first_prompt` (boolean, optional): Controls conversation initiation
    -   `True` (default): AI starts by sending the prompt message to the user
    -   `False`: AI waits for the user to send a message first
-   `default_values` (dict, optional): Example values to structure expected responses
-   `info` (dict, optional): Additional context for the conversation

**The Loop-Until Pattern:**

-   The `loop` keyword begins a repeatable conversation block
-   The `talk` function within the loop handles the conversation exchange
-   The `until` clause specifies a condition (in natural language) under which the loop should end
-   The code block after `until` validates whether the condition has been met
    -   If the condition is met (the code executes successfully), the loop exits
    -   If the condition is not met, the loop repeats from the beginning

**Example:**

```
loop:
    book_preference = talk(
        "What genre of books do you enjoy reading?",
        True,
        {"genre": "mystery", "format": "paperback"}
    )
until "User provides a valid book genre and format":
    preference_data = book_preference.ask(
        question="Extract the user's book genre and preferred format.",
        example={"genre": "mystery", "format": "paperback"}
    )

    # Validate the genre and format
    if preference_data["genre"] not in ["mystery", "sci-fi", "romance", "non-fiction"]:
        print("Invalid genre provided. Re-prompting...")
        continue

    if preference_data["format"] not in ["paperback", "hardcover", "e-book", "audiobook"]:
        print("Invalid format provided. Re-prompting...")
        continue

    # If we reach here, both genre and format are valid
    print("Valid preferences received!")
```

### Data Processing Methods

Based provides powerful methods to transform and extract information from data objects. These methods can be applied to any data object, not just conversation responses.

#### The `.ask` Method

The `.ask` method extracts structured data from any data object, transforming unstructured content into well-formed data that can be used programmatically. This method can be used with API responses, conversation results, or any other data.

**Syntax:**

```
data_object.ask(question, example=None, schema=None, model=None)
```

**Parameters:**

-   `question` (string): Instruction for extracting specific information from the data
-   `example` (dict, optional): Example object showing the expected output format
-   `schema` (dict, optional): JSON schema defining the expected structure
-   `model` (string, optional): AI model to use for extraction

**Return Value:**

-   Returns structured data according to the example or schema provided

**Example:**

```
# Extract structured book preferences from a conversation response
preferences = response.ask(
    question="Extract the user's preferred book genre, format, and any specific authors they mentioned.",
    example={
        "genre": "mystery",
        "format": "audiobook",
        "authors": ["Agatha Christie", "Arthur Conan Doyle"]
    }
)

# Use .ask on an API response
api_results = api.get_req(
    url='https://bookstore-api.example.com/books',
    headers={'authorization': 'Bearer ' + auth_token},
    params={'genre': 'mystery'}
).ask(
    question="Extract the book titles, authors, and prices from the API response.",
    example={"books": [{"title": "The Mystery", "author": "A. Writer", "price": "$12.99"}]}
)
```

#### The `.summarize` Method

The `.summarize` method creates a concise summary of the information contained in any data object. This is particularly useful for large text blocks or complex data structures.

**Syntax:**

```
data_object.summarize(prompt=None, model=None)
```

**Parameters:**

-   `prompt` (string, optional): Specific instruction for creating the summary
-   `model` (string, optional): AI model to use for summarization

**Return Value:**

-   Returns a string containing the summary

**Example:**

```
# Summarize a lengthy document
document_content = document.read(url="https://example.com/lengthy-report.pdf")
summary = document_content.summarize(
    prompt="Provide a 3-paragraph summary of this financial report, focusing on key metrics and projections."
)

# Create a concise summary of API results
search_results = google_search.search(query="latest developments in quantum computing")
key_points = search_results.summarize(
    prompt="Extract the 5 most significant recent breakthroughs in quantum computing mentioned in these results."
)
```

## Advanced Patterns

### Multiple `until` Statements

Based allows for sophisticated conversation flows by supporting multiple `until` statements. Each `until` block represents a different condition and can trigger different handling paths.

```
# Multi-condition conversation handler example
loop:
    response = talk(
        "Welcome to our customer service bot. What can I help you with today?",
        True
    )
until "User wants to check order status":
    order_query = response.ask(
        question="Is the user asking about checking their order status? Extract order number if mentioned.",
        example={"is_order_status": true, "order_number": "ABC123"}
    )

    if order_query["is_order_status"]:
        # Handle order status request
        if "order_number" in order_query and order_query["order_number"]:
            order_details = get_order_details(order_query["order_number"])
            say(f"Your order {order_query['order_number']} is {order_details['status']}. Expected delivery: {order_details['delivery_date']}", exact=True)
        else:
            say("I'd be happy to check your order status. Could you please provide your order number?", exact=True)
        break
until "User wants to make a return":
    return_query = response.ask(
        question="Is the user asking about making a return? Extract product details if mentioned.",
        example={"is_return": true, "product": "Wireless Headphones"}
    )

    if return_query["is_return"]:
        # Handle return request
        say("I can help you process a return. Let me guide you through our return policy and steps.", exact=True)
        # Additional return handling logic
        break
until "User wants to speak to human agent":
    agent_query = response.ask(
        question="Does the user want to speak to a human agent?",
        example={"wants_human": true}
    )

    if agent_query["wants_human"]:
        say("I'll connect you with a customer service representative right away. Please hold for a moment.", exact=True)
        transfer_to_agent()
        break
```

### Conditional Flow Control

Based scripts can implement conditional flow control using standard Python syntax, allowing for dynamic conversation paths based on user responses.

```
# Determine recommendation approach based on user expertise and preferences
loop:
    expertise_response = talk("How familiar are you with this book genre?", True)
until "User indicates their expertise level and reading preferences":
    user_profile = expertise_response.ask(
        question="Determine the user's expertise level and reading preferences.",
        example={
            "level": "beginner",
            "prefers_series": true,
            "likes_long_books": false
        }
    )

    # Create a personalized recommendation strategy
    if user_profile["level"] == "beginner":
        if user_profile["prefers_series"]:
            recommendations = get_beginner_series_recommendations(preferences["genre"])
            say(f"Since you're new to {preferences['genre']} and enjoy series, I recommend starting with these accessible series:", exact=True)
        else:
            recommendations = get_beginner_standalone_recommendations(preferences["genre"])
            say(f"For someone new to {preferences['genre']}, these standalone books are perfect introductions:", exact=True)
    elif user_profile["level"] == "intermediate":
        if user_profile["likes_long_books"]:
            recommendations = get_intermediate_long_recommendations(preferences["genre"])
        else:
            recommendations = get_intermediate_short_recommendations(preferences["genre"])
    else:
        # Expert reader
        recommendations = get_expert_recommendations(preferences["genre"])
        say(f"For an expert reader like yourself, these critically acclaimed {preferences['genre']} books offer complex narratives:", exact=True)

    # Display the recommendations
    for i, book in enumerate(recommendations[:3]):
        say(f"{i+1}. '{book['title']}' by {book['author']} - {book['description']}", exact=True)
```

## Platform-Specific Functions

Based supports different deployment platforms (chat, voice, email, SMS) and provides specialized functions for each platform. These functions allow you to take advantage of platform-specific capabilities.

### Voice Deployment Functions

When your Based agent is deployed for voice conversations, you can use these special functions to control call flow:

**`transfer_call(phone_number)`**: Transfers the current call to another phone number.

```
# Transfer call to customer support if user requests it
if user_request["needs_human_support"]:
    say("I'll transfer you to our customer support team right away.", exact=True)
    transfer_call("+1-800-123-4567")
```

**`hangup()`**: Ends the current call.

```
# End call after completing the transaction
say("Thank you for your order! Your confirmation number is ABC123. Have a great day!", exact=True)
hangup()
```

### SMS Deployment Functions

For SMS deployments, Based provides specialized functions for text messaging:

**`send_image(url)`**: Sends an image in the conversation.

```
# Send product image in SMS conversation
product_details = get_product_info("ABC123")
say(f"Here's the {product_details['name']} you inquired about:", exact=True)
send_image(product_details["image_url"])
```

## Full Example: Book Recommendation Agent

Here’s a complete example that demonstrates the various language constructs working together, including multiple `until` statements:

```
state = {}
meta_prompt = "You're a book recommendation assistant helping users find their next great read."
res = say("Hello! I'm BookBot, your personal book recommendation assistant.", exact=True)

# Introduce the service and set expectations
say("I can help you find books based on your preferences, including genre, format, and reading level.")

# Collect initial user preferences with multiple until paths
loop:
    initial_response = talk(
        f"{meta_prompt} Ask the user what they're looking for today, offering to recommend books, find new releases, or check book availability.",
        True
    )
until "User wants book recommendations":
    recommendation_request = initial_response.ask(
        question="Is the user asking for book recommendations?",
        example={"wants_recommendations": true}
    )

    if recommendation_request["wants_recommendations"]:
        # Handle recommendation path
        state["intent"] = "recommendations"

        # Collect genre preferences
        loop:
            genre_response = talk(
                "What genre of books do you enjoy reading?",
                True,
                {"genre": "fantasy", "format": "e-book"}
            )
        until "User provides valid genre and format preferences":
            preferences = genre_response.ask(
                question="Extract the user's preferred book genre and format.",
                example={"genre": "fantasy", "format": "e-book"}
            )

            if preferences["genre"] and preferences["format"]:
                state["preferences"] = preferences
                break

        # Generate recommendations
        recommendations = api.get_req(
            url='https://bookstore-api.example.com/recommendations',
            params=state["preferences"]
        ).ask(
            question="Extract the top 3 book recommendations with title, author, and description.",
            example={"books": [{"title": "Book Title", "author": "Author Name", "description": "Brief description"}]}
        )

        # Present recommendations
        say(f"Based on your interest in {state['preferences']['genre']} books, here are 3 titles I think you'll love:", exact=True)
        for i, book in enumerate(recommendations["books"]):
            say(f"{i+1}. '{book['title']}' by {book['author']}: {book['description']}", exact=True)
        break
until "User wants to check new releases":
    new_release_request = initial_response.ask(
        question="Is the user asking about new or upcoming book releases?",
        example={"wants_new_releases": true, "genre": "thriller"}
    )

    if new_release_request["wants_new_releases"]:
        # Handle new releases path
        state["intent"] = "new_releases"
        genre = new_release_request.get("genre", "")

        # Get new releases, optionally filtered by genre
        new_releases = api.get_req(
            url='https://bookstore-api.example.com/new-releases',
            params={"genre": genre} if genre else {}
        ).ask(
            question="Extract the latest 5 book releases with title, author, and release date.",
            example={"books": [{"title": "New Book", "author": "Author Name", "release_date": "2023-10-15"}]}
        )

        # Present new releases
        header = f"Here are the latest releases in {genre}:" if genre else "Here are the latest book releases:"
        say(header, exact=True)
        for i, book in enumerate(new_releases["books"]):
            say(f"{i+1}. '{book['title']}' by {book['author']} - Released: {book['release_date']}", exact=True)
        break
until "User wants to check book availability":
    availability_request = initial_response.ask(
        question="Is the user asking about checking if a specific book is available?",
        example={"checking_availability": true, "book_title": "The Great Novel", "author": "Famous Writer"}
    )

    if availability_request["checking_availability"]:
        # Handle availability check path
        state["intent"] = "check_availability"

        book_info = {}
        if "book_title" in availability_request:
            book_info["title"] = availability_request["book_title"]
        if "author" in availability_request:
            book_info["author"] = availability_request["author"]

        # If we have complete information, check availability
        if "title" in book_info and "author" in book_info:
            availability = check_book_availability(book_info["title"], book_info["author"])
            if availability["available"]:
                say(f"Good news! '{book_info['title']}' by {book_info['author']} is available in these formats: {', '.join(availability['formats'])}", exact=True)
            else:
                say(f"I'm sorry, '{book_info['title']}' by {book_info['author']} is currently unavailable. Would you like me to notify you when it becomes available?", exact=True)
        else:
            # Need more information
            loop:
                book_details_response = talk(
                    "I'd be happy to check book availability. Could you please provide the book title and author?",
                    True
                )
            until "User provides complete book details":
                details = book_details_response.ask(
                    question="Extract the book title and author from the user's response.",
                    example={"title": "The Great Novel", "author": "Famous Writer"}
                )

                if "title" in details and "author" in details:
                    availability = check_book_availability(details["title"], details["author"])
                    if availability["available"]:
                        say(f"Good news! '{details['title']}' by {details['author']} is available in these formats: {', '.join(availability['formats'])}", exact=True)
                    else:
                        say(f"I'm sorry, '{details['title']}' by {details['author']} is currently unavailable. Would you like me to notify you when it becomes available?", exact=True)
                    break
        break

# Conversation wrap-up
say("Is there anything else I can help you with today?", exact=True)
```

## Conclusion

The Based language provides a powerful yet intuitive framework for building conversational agents. By mastering the core constructs—particularly the essential `loop`\-`talk`\-`until` pattern—you can create sophisticated conversation flows that handle complex interactions while maintaining readability and maintainability.

Remember that Based is designed to be declarative, allowing you to focus on the “what” rather than the “how” of conversational AI. This approach dramatically reduces the amount of code needed to create powerful agents while increasing reliability and ease of maintenance.

The combination of the core language constructs with platform-specific functions allows you to build agents that take full advantage of each deployment platform’s unique capabilities while maintaining a consistent codebase and user experience.
