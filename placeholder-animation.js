// Placeholder animation for the search box input field
// placeholders array
const placeholders = [
  "Search for your favourite restaurant!",
  "Where are you eating today?",
  "Mexican, Italian, Chinese?",
  "Barbecue, Sushi, Fondue?",
  "Browse our selection!",
  "French in San Francisco?",
];

// delay between 50 and 90 ms
const delayBetweenLetters = () =>
  // generate a number between 0 and less than 41, then add 50
  Math.floor(Math.random() * 41) + 50;

// function called to start the placeholder animation. Input is the search box input element
export function startPlaceholderAnimation(input) {
  // current index of the placeholder being typed
  let currentIndex = 0;

  // function to type out each placeholder letter by letter
  function type(text, index = 0) {
    // slice here is used to get the substring of the text up to the current index
    input.placeholder = text.slice(0, index);

    // continue typing the next letter after a random delay
    if (index < text.length) {
      // execute the typing of the next letter after a random delay
      setTimeout(
        () => type(text, index + 1),
        delayBetweenLetters()
      );
      // return here to prevent the next placeholder from being typed immediatelys
      return;
    }
    // wait for 2 seconds before typing the next placeholder
    setTimeout(() => {
      currentIndex = (currentIndex + 1) % placeholders.length;
      type(placeholders[currentIndex]);
    }, 2000);
  }
  // start typing the first placeholder immediately
  type(placeholders[currentIndex]);
}