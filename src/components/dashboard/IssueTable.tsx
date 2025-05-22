import React from 'react';

interface IssueTableProps {
  issues: any[];
  loading: boolean;
}

export const IssueTable: React.FC<IssueTableProps> = ({ issues, loading }) => {
  if (loading) {
    return <div>Loading issues...</div>;
  }

  return (
    <table className="issue-table">
      <thead>
        <tr>
          <th>Issue ID</th>
          <th>Title</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
        {issues.map((issue) => (
          <tr key={issue.id}>
            <td>{issue.id}</td>
            <td>{issue.title}</td>
            <td>{issue.status}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}; 