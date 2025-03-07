import React from 'react';

// Mock data for demo purposes
const demos = [
  {
    id: 1,
    companyName: 'Acme Inc.',
    dateBooked: '2023-03-01',
    dateOfDemo: '2023-03-10',
    emailReminder: true,
    phoneReminder: false,
    status: 'Showed',
  },
  {
    id: 2,
    companyName: 'Globex Corp',
    dateBooked: '2023-03-02',
    dateOfDemo: '2023-03-12',
    emailReminder: true,
    phoneReminder: true,
    status: 'In Progress',
  },
  {
    id: 3,
    companyName: 'Initech',
    dateBooked: '2023-03-03',
    dateOfDemo: '2023-03-15',
    emailReminder: true,
    phoneReminder: false,
    status: 'Didn\'t Show',
  },
  {
    id: 4,
    companyName: 'Umbrella Corp',
    dateBooked: '2023-03-05',
    dateOfDemo: '2023-03-18',
    emailReminder: true,
    phoneReminder: true,
    status: 'Rebook',
  },
  {
    id: 5,
    companyName: 'Stark Industries',
    dateBooked: '2023-03-07',
    dateOfDemo: '2023-03-20',
    emailReminder: false,
    phoneReminder: false,
    status: 'Scheduled',
  },
];

const DemoTable = () => {
  return (
    <div className="flex flex-col">
      <div className="-my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
        <div className="py-2 align-middle inline-block min-w-full sm:px-6 lg:px-8">
          <div className="shadow overflow-hidden border-b border-gray-200 sm:rounded-lg">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Company
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date Booked
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date of Demo
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Email Reminder
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Phone Reminder
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th scope="col" className="relative px-6 py-3">
                    <span className="sr-only">Edit</span>
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {demos.map((demo) => (
                  <tr key={demo.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{demo.companyName}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{demo.dateBooked}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{demo.dateOfDemo}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <input
                        type="checkbox"
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        checked={demo.emailReminder}
                        onChange={() => {}}
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <input
                        type="checkbox"
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        checked={demo.phoneReminder}
                        onChange={() => {}}
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <select
                        className="block w-full pl-3 pr-10 py-1 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                        value={demo.status}
                        onChange={() => {}}
                      >
                        <option>Scheduled</option>
                        <option>In Progress</option>
                        <option>Showed</option>
                        <option>Didn't Show</option>
                        <option>Rebook</option>
                      </select>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <a href="#" className="text-blue-600 hover:text-blue-900">
                        Edit
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DemoTable; 