// Common Indian first names, lowercase. Tagged "X" so names do not inflate either language.
// Capitalised unknown words in the middle of a sentence are also treated as names (see tagger.ts).
const WORDS = `
rahul priya amit neha rohit pooja puja sneha suresh ramesh mahesh ganesh anil sunil vijay ajay
sanjay sanjeev rajesh rakesh deepak vikas vivek ankit ankita akash aakash arjun karan kavita
sunita anita sita geeta gita lakshmi laxmi ravi ram shyam mohan sohan kiran manoj manish mukesh
naveen nitin prakash pradeep rajiv ritu rohan sachin sandeep sanjana shweta sumit sushma tarun
varun yash yogesh aditya aarav ishaan kabir ananya diya riya kavya meera mira nisha swati divya
shikhar
`;

export const NAMES: ReadonlySet<string> = new Set(WORDS.split(/\s+/).filter(Boolean));
