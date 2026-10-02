// Placeholder animation for the search box input field
// placeholders array
const placeholders = [
  "Search for your favourite restaurant!",
  "Where are you eating today?",
  "Mexican, Italian, Chinese?",
  "Barbecue, Sushi, Fondue?",
  "Browse our selection!",
];

// delay between 50 and 90 ms
const delayBetweenLetters = () =>
  Math.floor(Math.random() * 41) + 50;

// function called to start the placeholder animation
export function startPlaceholderAnimation(input) {
  // current index of the placeholder being typed
  let currentIndex = 0;

  // function to type out each placeholder letter by letter
  function type(text, index = 0) {
    input.placeholder = text.slice(0, index);
    
    // continue typing the next letter after a random delay
    if (index < text.length) {
      setTimeout(
        () => type(text, index + 1),
        delayBetweenLetters()
      );
      return;
    }
    // wait for 2 seconds before typing the next placeholder
    setTimeout(() => {
      currentIndex = (currentIndex + 1) % placeholders.length;
      type(placeholders[currentIndex]);
    }, 2000);
  }

  type(placeholders[currentIndex]);
}