// Region-flavoured Indian name pools, so a Chennai lead reads like a Chennai
// lead and a Kolkata lead like a Kolkata one. Purely for demo credibility.
export const NAME_POOLS = {
  north: {
    first: ['Aarav','Rohit','Vikram','Ankit','Rahul','Naveen','Gaurav','Manish','Sandeep','Pankaj','Deepak','Nitin','Arjun','Karan','Rajat','Tarun','Vishal','Amit','Sumit','Harsh','Priya','Neha','Pooja','Kavita','Ritika','Shalini','Anjali','Meenakshi','Divya','Swati','Nidhi','Rashmi','Sneha','Aarti','Isha'],
    last: ['Sharma','Verma','Gupta','Aggarwal','Chauhan','Malhotra','Kapoor','Bhatia','Sethi','Khanna','Arora','Bansal','Chopra','Saxena','Tiwari','Mishra','Yadav','Singh','Rathore','Jain','Goel','Sinha','Dua','Ahluwalia','Grover'],
  },
  west: {
    first: ['Omkar','Sagar','Nilesh','Pranav','Mihir','Kunal','Swapnil','Jayesh','Chirag','Bhavesh','Hardik','Parth','Rushabh','Tejas','Yash','Aniket','Sameer','Ketan','Nikhil','Siddharth','Sneha','Aditi','Shreya','Mrunal','Rutuja','Tanvi','Bhakti','Kalyani','Vaishnavi','Ashwini','Trupti','Payal','Hetal','Krupa','Nisha'],
    last: ['Patil','Deshmukh','Kulkarni','Joshi','Shah','Patel','Mehta','Desai','Trivedi','Bhatt','Chavan','Jadhav','Sawant','Gaikwad','Pawar','Rane','Wagh','Shinde','Thakkar','Modi','Doshi','Vora','Parikh','Amin','Panchal'],
  },
  south_ka: {
    first: ['Deepak','Kiran','Manoj','Prashanth','Vinay','Suhas','Girish','Nagaraj','Chetan','Sandesh','Praveen','Harsha','Rakesh','Shashank','Anand','Bhavana','Divya','Shruthi','Pallavi','Sowmya','Chaitra','Ramya','Nandini','Deepa','Rashmi'],
    last: ['Nair','Rao','Shetty','Gowda','Hegde','Kamath','Bhat','Pai','Reddy','Murthy','Iyengar','Prasad','Kulkarni','Naik','Acharya','Shenoy','Udupa','Rai','Jain','Setty'],
  },
  south_tn: {
    first: ['Karthik','Suresh','Ramesh','Vignesh','Prabhu','Dinesh','Saravanan','Arun','Bala','Hariharan','Muthu','Senthil','Vasanth','Ashwin','Gokul','Lakshmi','Priyanka','Divya','Kavya','Meena','Revathi','Janani','Nandhini','Deepika','Abirami'],
    last: ['Subramanian','Iyer','Krishnan','Raman','Natarajan','Sundaram','Venkatesh','Rajan','Balaji','Chandrasekar','Murugan','Pillai','Ganesan','Srinivasan','Kumaraswamy','Ravichandran','Anand','Mahadevan','Sethuraman','Vaidyanathan'],
  },
  south_kl: {
    first: ['Anoop','Jithin','Sreejith','Vivek','Nikhil','Arun','Manu','Rahul','Vinod','Sanoj','Aparna','Lekha','Anjana','Reshma','Athira','Gayathri','Nimisha','Sruthi','Maya','Deepthi'],
    last: ['Nair','Menon','Pillai','Varma','Kurup','Namboothiri','Thomas','Mathew','Jacob','George','Joseph','Panicker','Raghavan','Unnikrishnan','Krishnan'],
  },
  south_ap: {
    first: ['Srinivas','Ravi','Naresh','Kishore','Venkat','Prasad','Chandra','Mahesh','Satish','Bhaskar','Sailaja','Padmaja','Lavanya','Swapna','Jyothi','Sirisha','Madhavi','Bhavani','Aruna','Rajitha'],
    last: ['Reddy','Naidu','Chowdary','Rao','Prasad','Varma','Sarma','Raju','Babu','Murthy','Gupta','Kumar','Sastry','Pillai','Achari'],
  },
  east_wb: {
    first: ['Arindam','Subhankar','Debashish','Sourav','Rajib','Tanmoy','Prosenjit','Abhijit','Sandip','Bikash','Ananya','Rituparna','Moumita','Sudeshna','Paromita','Debolina','Srabani','Piyali','Madhumita','Sohini'],
    last: ['Banerjee','Chatterjee','Mukherjee','Ghosh','Bose','Das','Dutta','Sen','Roy','Chakraborty','Bhattacharya','Sarkar','Mitra','Majumdar','Guha'],
  },
  east_other: {
    first: ['Manoj','Bibhuti','Sanjay','Rakesh','Alok','Dhiraj','Prakash','Ranjan','Sushil','Abhishek','Sunita','Rekha','Anita','Mamata','Sasmita','Puja','Kumari','Nilima','Archana','Sangeeta'],
    last: ['Mohanty','Patnaik','Behera','Das','Sahu','Panda','Pradhan','Jena','Kumar','Prasad','Singh','Mahto','Oraon','Baruah','Deka','Bora','Saikia','Nath','Choudhury','Gogoi'],
  },
}

export const STATE_TO_POOL = {
  Maharashtra: 'west', Gujarat: 'west',
  Delhi: 'north', Haryana: 'north', 'Uttar Pradesh': 'north', Punjab: 'north', Rajasthan: 'north',
  Karnataka: 'south_ka', 'Tamil Nadu': 'south_tn', Kerala: 'south_kl',
  Telangana: 'south_ap', 'Andhra Pradesh': 'south_ap',
  'West Bengal': 'east_wb', Odisha: 'east_other', Bihar: 'east_other',
  Assam: 'east_other', Jharkhand: 'east_other',
}
